// N2.2 笔画引擎
// 楷体 = 本地权威笔顺逐笔（C2 起数据源切换为 cnchar 内置，零网络；C3 将补「字体轮廓 + 笔顺」逐笔轨迹）；
// 宋体 = 整字显现（fillText，透明度/缩放淡入）；
// 古文字（小篆，V1-C1 D-V1-01）= 受限字库整字显现（按 U+3D000+ 码位 fillText，不承诺笔顺）。
import type { GlyphPlacement, StrokeOrderResult, StrokeGlyph } from './types';
import type { OutlineGlyph, OutlinePoint } from './outline';
import { hasOutline } from './outline';
import { getSealFontStack } from '@/lib/seal';
import { getLiFontStack } from '@/lib/lishu';
import { getStrokeOrder } from './strokeOrder';
import { getCustomStrokeOrder } from './customStroke';
import {
  applyGlyphTransform,
  designLineWidth,
  inkStyle,
  outlineBox,
  progressByStyle,
  strokeWidthAt,
  alphaAt,
  WHOLE_GLYPH_INK_STYLE,
  OUTLINE_INK_STYLE,
  type InkStyle,
} from './draw';

// C2/C3/C4：权威性笔顺（A+B）、用户定制（C）与字形轮廓均为本地内置/本地存储（零网络）。

// C2/C4：笔顺缓存。键=字符；值=null 表示权威表与用户定制均未收录 → 走 C3 轮廓兜底。
const orderCache = new Map<string, StrokeOrderResult | null>();

/**
 * C2/C4：加载单字笔顺，优先级 C(用户定制) > A+B(权威内置)。
 * 仅对 CJK 且可命中的字返回结果；其余（标点/字母/数字/生僻字）返回 null，
 * 由调用方走整字/轮廓降级。彻底脱离 hanzi-writer CDN（BUG-003 根因已根除）。
 */
export async function loadStrokeData(ch: string): Promise<StrokeOrderResult | null> {
  if (orderCache.has(ch)) return orderCache.get(ch) ?? null;
  // C 层：用户定制优先（最高优先级）
  const custom = await getCustomStrokeOrder(ch);
  if (custom && custom.length > 0) {
    const result: StrokeOrderResult = { order: custom, strokeCount: custom.length, source: 'user' };
    orderCache.set(ch, result);
    return result;
  }
  // A+B 层：权威内置表
  const order = await getStrokeOrder(ch);
  if (order == null) {
    orderCache.set(ch, null); // 记忆缺失，避免重复查表
    return null;
  }
  const result: StrokeOrderResult = { order, strokeCount: order.length, source: 'authority' };
  orderCache.set(ch, result);
  return result;
}

/** C4：用户修改定制后失效笔顺缓存，使下次查询回源最新 C 层数据。 */
export function invalidateStrokeDataCache(): void {
  orderCache.clear();
}

/**
 * C2：批量预加载（仅对已判定为 CJK 且本地有数据的字发起查表，零网络 404）。
 * 注意：调用方应先用 isCjkWithOrder 过滤，避免对无意义字符查表。
 */
export function preloadStrokeData(chars: string[]): Promise<void> {
  return Promise.all(chars.map((c) => loadStrokeData(c))).then(() => undefined);
}

/** C2：判定字符是否可能具有本地权威笔顺（CJK 统一表意文字区块，含扩展 A）。 */
export function isCjkWithOrder(ch: string): boolean {
  const cp = ch.codePointAt(0);
  if (cp == null) return false;
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK 基本区
    (cp >= 0x3400 && cp <= 0x4dbf) // 扩展 A
  );
}

// ===== 楷体：轮廓·笔顺驱动逐笔（C3） =====
//
// C3 起：数据源为本地权威笔顺（C1/C2）+ 本地楷体字形轮廓（build-kai-outline.py）。
// 不依赖 hanzi-writer 中线，而是把整字轮廓展平为直线段序列，按笔顺笔画数 N 均匀分段，
// 第 i 笔在区间 [i/N,(i+1)/N] 内按局部进度描绘——任意字体（只要 outline 可解析）均可逐笔动画。
// 注：FlatSeg / flattenContour / QUAD_SEG 复用本文件下方 drawGlyphOutline 区域的既有定义。

/** 按笔顺切分后的逐笔路径。 */
export interface StrokePaths {
  /** 每笔对应的直线段序列（设计坐标） */
  strokes: FlatSeg[][];
  /** 整字轮廓总弧长（设计坐标） */
  total: number;
  /**
   * C5：源字形设计框（统一坐标变换用）。
   * 此前由 currentOutlineBox 从段坐标实时估算，导致与 drawGlyphOutline 的包围盒来源不一致；
   * C5 起直接随路径携带，保证两条路径的居中/缩放口径完全一致。
   */
  box?: { unitsPerEm: number; xMin: number; yMin: number; xMax: number; yMax: number };
}

/**
 * C3：把整字轮廓展平并「按笔顺笔画数」均匀切分为 N 段笔画路径。
 * strokeCount 来自权威笔顺 order 长度（C2）。返回可直接供 drawKaiGlyph 描出的分段。
 */
export function buildStrokePaths(outline: OutlineGlyph, strokeCount: number): StrokePaths {
  const all: FlatSeg[] = [];
  if (hasOutline(outline)) {
    for (const c of outline.contours) {
      for (const s of flattenContour(c.points)) all.push(s);
    }
  }
  const total = all.reduce((s, x) => s + x.len, 0) || 1;
  const n = Math.max(1, strokeCount);
  const per = total / n;
  const strokes: FlatSeg[][] = Array.from({ length: n }, () => []);
  let acc = 0;
  let idx = 0;
  for (const s of all) {
    // 把段分配到「当前笔画桶」，保证每桶累计弧长≈per
    while (idx < n - 1 && acc >= per * (idx + 1)) idx++;
    strokes[idx].push(s);
    acc += s.len;
  }
  return { strokes, total, box: outlineBox(outline) };
}

/**
 * C3/C5：在 glyph 方块内绘制楷体逐笔（统一书写基元驱动）。
 * progress∈[0,1] 表示整个字的书写完成度。
 *
 * C5 增强（观感）：
 *   · 速度曲线——笔内进度经 progressByStyle（scribe）重映射，起笔略迟滞、行笔加速、收笔略顿；
 *   · 笔锋——每段按笔内进度 u 用 strokeWidthAt 调线宽，起收笔收细；
 *   · 墨迹浓淡——每段按 u 用 alphaAt 调 globalAlpha，笔画两端略淡。
 *
 * @param paths buildStrokePaths 产出的分段笔画路径
 * @param style 观感参数（缺省 DEFAULT_INK_STYLE）
 */
export function drawKaiGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  paths: StrokePaths,
  progress: number,
  color: string,
  opts: { lineWidth?: number; style?: Partial<InkStyle> } = {},
) {
  const S = glyph.size;
  void S; // C5：方块尺寸由统一变换处理，此处仅保留可读性
  const n = paths.strokes.length;
  if (n === 0) return;
  const drawn = progress * n; // 已书写的"笔画量"
  const st = inkStyle({ color, ...(opts.style ?? {}) });
  ctx.save();
  // C5：统一坐标变换（全工程唯一实现，替代原 currentOutlineBox 实时估算）
  const box = paths.box ?? { unitsPerEm: 1024, xMin: 0, yMin: 0, xMax: 1024, yMax: 1024 };
  const tf = applyGlyphTransform(ctx, glyph, box);
  const em = box.unitsPerEm || 1024;
  const baseW = opts.lineWidth ?? designLineWidth(st, em, tf.pxPerUnit, 0.5);
  ctx.strokeStyle = st.color;
  ctx.lineCap = st.round ? 'round' : 'butt';
  ctx.lineJoin = st.round ? 'round' : 'miter';
  for (let i = 0; i < n; i++) {
    const uRaw = i + 1 <= drawn ? 1 : i < drawn ? drawn - i : null;
    if (uRaw === null) continue;
    // C5：笔内进度先经速度曲线重映射（scribe），再用于线宽/浓淡
    const u = progressByStyle(uRaw, st.speedCurve);
    const segs = paths.strokes[i];
    if (uRaw >= 1) {
      drawSegFull(ctx, segs, baseW * strokeWidthAt(u, st), st.color, alphaAt(u, st));
    } else {
      drawSegPartial(ctx, segs, u, baseW, st);
    }
  }
  ctx.restore();
}

function drawSegFull(
  ctx: CanvasRenderingContext2D,
  segs: FlatSeg[],
  width: number,
  color: string,
  alpha: number,
) {
  const prevW = ctx.lineWidth;
  const prevA = ctx.globalAlpha;
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  for (const s of segs) {
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.lineTo(s.x1, s.y1);
    ctx.stroke();
  }
  ctx.lineWidth = prevW;
  ctx.globalAlpha = prevA;
}

function drawSegPartial(
  ctx: CanvasRenderingContext2D,
  segs: FlatSeg[],
  u: number,
  baseW: number,
  st: InkStyle,
) {
  let acc = 0;
  const total = segs.reduce((s, x) => s + x.len, 0) || 1;
  const target = total * clamp01(u);
  const prevW = ctx.lineWidth;
  const prevA = ctx.globalAlpha;
  ctx.strokeStyle = st.color;
  for (const s of segs) {
    if (s.len === 0) continue;
    const remain = target - acc;
    if (remain <= 0) break;
    // 该段起点处的笔内进度 → 笔锋线宽 + 墨迹浓淡
    const progressAtSeg = acc / total;
    ctx.lineWidth = baseW * strokeWidthAt(progressAtSeg, st);
    ctx.globalAlpha = alphaAt(progressAtSeg, st);
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    if (s.len <= remain) {
      ctx.lineTo(s.x1, s.y1);
      acc += s.len;
    } else {
      const r = remain / s.len;
      ctx.lineTo(s.x0 + (s.x1 - s.x0) * r, s.y0 + (s.y1 - s.y0) * r);
      ctx.stroke();
      break;
    }
    ctx.stroke();
  }
  ctx.lineWidth = prevW;
  ctx.globalAlpha = prevA;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ===== 整字显现（song / brush / 自定义字体 / seal / li 共用基元） =====
//
// C5 统一：此前 drawSongGlyph 与 drawRestrictedGlyph 两个函数体几乎完全重复（仅字号系数不同），
// 现合并为单一 drawWholeGlyph，观感统一由 InkStyle 驱动（墨渗渐显，替代原线性 globalAlpha）。

/**
 * C5：整字显现统一基元。
 * @param fontStack CSS 字体栈
 * @param sizeRatio 字号相对方块的比例（宋体/自定义 0.92；受限字库 0.95）
 * @param style 观感参数（缺省 WHOLE_GLYPH_INK_STYLE）
 */
export function drawWholeGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
  fontStack?: string,
  sizeRatio = 0.92,
  style: Partial<InkStyle> = {},
): void {
  if (progress <= 0) return;
  const st = inkStyle({ ...WHOLE_GLYPH_INK_STYLE, color, ...style });
  const cx = glyph.x + glyph.size / 2;
  const cy = glyph.y + glyph.size / 2;
  const p = Math.min(1, progress);
  ctx.save();
  // C5：墨渗渐显——透明度 + 极轻微放大（0.985→1），替代原线性淡入的廉价感
  const eased = p * p * (3 - 2 * p); // smoothstep
  ctx.globalAlpha = alphaAt(0.5, st) * eased;
  ctx.fillStyle = st.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const stack =
    fontStack ?? '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif';
  ctx.font = `${Math.round(glyph.size * sizeRatio)}px ${stack}`;
  const scale = 0.985 + 0.015 * eased;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillText(glyph.char, 0, 0);
  ctx.restore();
}

/**
 * V2-C4 N4.1：fontStack 可选。传入时使用调用方字体栈（内置宋体 / 用户上传字体 / 内置毛笔体）。
 * C5 起内部改调 drawWholeGlyph（签名不变，向后兼容）。
 */
export function drawSongGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
  fontStack?: string,
) {
  drawWholeGlyph(ctx, glyph, progress, color, fontStack, 0.92);
}

// ===== 受限字库（小篆/隶书）：整字显现（按码位 fillText，整字淡入，不承诺笔顺） =====
/**
 * V2-C2 N2.2：受限字库通用整字显现（seal/li 复用）。
 * C5 起内部改调 drawWholeGlyph（签名不变，向后兼容）。
 */
export function drawRestrictedGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
  fontStack?: string,
): void {
  drawWholeGlyph(ctx, glyph, progress, color, fontStack, 0.95);
}

/** 古文字（小篆）：受限字库整字显现（按小篆码位 fillText）。签名保持不变（向后兼容）。 */
export function drawSealGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
): void {
  // V2-C1 N1.1：使用动态字体回退栈（L1→L0→L2）；glyph.char 已映射为小篆码位（见 scene.ts）。
  drawRestrictedGlyph(ctx, glyph, progress, color, getSealFontStack());
}

/** V2-C2 N2.2：隶书受限字库整字显现（字体栈回退系统隶书族）。 */
export function drawLiGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
): void {
  drawRestrictedGlyph(ctx, glyph, progress, color, getLiFontStack());
}

// ===== V2-C2 N2.3：矢量轮廓描边动画（弧长截断，自研 TTF 轮廓） =====
//
// Canvas2D 无 lineDashOffset 的通用「按进度描边」能力（且需与导出帧一致），故采用
// 「按累计弧长截断」策略：沿所有轮廓顺序推进，当累计长度达到 progress×总长时，在最后一段内部插值收尾。
// 轮廓为「直线段 + 二次贝塞尔」混合；曲线按固定子段采样近似。

export interface OutlineDrawOptions {
  /** 描边线宽（设计坐标→画布像素，缺省约为字面宽 4%） */
  lineWidth?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  /** C5：观感参数覆盖（缺省 OUTLINE_INK_STYLE） */
  style?: Partial<InkStyle>;
}

const QUAD_SEG = 10; // 二次贝塞尔采样段数（弧长推进精度）

interface FlatSeg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
}
export type { FlatSeg };

/** 将单个轮廓展平为直线段序列（设计坐标），二次贝塞尔按弧长近似采样。 */
function flattenContour(points: OutlinePoint[]): FlatSeg[] {
  const n = points.length;
  if (n === 0) return [];
  const at = (i: number) => points[((i % n) + n) % n];
  let startIdx = 0;
  while (startIdx < n && !points[startIdx].on) startIdx++;
  if (startIdx === n) return [];
  const segs: FlatSeg[] = [];
  const push = (x0: number, y0: number, x1: number, y1: number) => {
    segs.push({ x0, y0, x1, y1, len: Math.hypot(x1 - x0, y1 - y0) });
  };
  let prev = points[startIdx];
  for (let k = 1; k <= n; ) {
    const cur = at(startIdx + k);
    if (cur.on) {
      push(prev.x, prev.y, cur.x, cur.y);
      prev = cur;
      k++;
    } else {
      const next = at(startIdx + k + 1);
      const endPt = next.on ? next : { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2, on: true };
      let px = prev.x;
      let py = prev.y;
      for (let s = 1; s <= QUAD_SEG; s++) {
        const tt = s / QUAD_SEG;
        const mt = 1 - tt;
        const x = mt * mt * prev.x + 2 * mt * tt * cur.x + tt * tt * endPt.x;
        const y = mt * mt * prev.y + 2 * mt * tt * cur.y + tt * tt * endPt.y;
        push(px, py, x, y);
        px = x;
        py = y;
      }
      prev = endPt;
      k += next.on ? 2 : 1;
    }
  }
  // 闭合
  if (prev.x !== points[startIdx].x || prev.y !== points[startIdx].y) {
    push(prev.x, prev.y, points[startIdx].x, points[startIdx].y);
  }
  return segs;
}

/**
 * 沿字形轮廓描绘显现（V2-C2 N2.3 / C5 统一）。
 * progress∈[0,1] 表示轮廓累计描绘完成度；仅对约 2% 的残余长度内插收尾。
 * C5：坐标变换改走统一 applyGlyphTransform（与 drawKaiGlyph 口径一致），并接入 InkStyle 观感。
 * 无轮廓数据时应由调用方回退整字填充（本函数不做兜底）。
 */
export function drawGlyphOutline(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  outline: OutlineGlyph,
  progress: number,
  color: string,
  opts: OutlineDrawOptions = {},
): void {
  if (progress <= 0) return;
  const contours = outline.contours;
  if (contours.length === 0) return;

  const st = inkStyle({ ...OUTLINE_INK_STYLE, color, ...(opts.style ?? {}) });
  ctx.save();
  // C5：统一坐标变换（消除与 drawKaiGlyph 的重复实现与包围盒来源不一致）
  const tf = applyGlyphTransform(ctx, glyph, outlineBox(outline));
  const em = outline.unitsPerEm || 1024;
  const baseW = opts.lineWidth ?? designLineWidth(st, em, tf.pxPerUnit, 0.5);

  ctx.strokeStyle = st.color;
  ctx.lineCap = opts.lineCap ?? (st.round ? 'round' : 'butt');
  ctx.lineJoin = opts.lineJoin ?? (st.round ? 'round' : 'miter');
  ctx.lineWidth = baseW;

  const total = totalTarget(outline);
  const target = Math.min(1, progress) * total;
  let acc = 0;
  outer: for (const contour of contours) {
    const segs = flattenContour(contour.points);
    for (const s of segs) {
      if (s.len === 0) continue;
      const remain = target - acc;
      if (remain <= 0) break outer;
      // C5：按已推进比例取笔锋线宽与墨迹浓淡
      const u = acc / total;
      ctx.lineWidth = baseW * strokeWidthAt(u, st);
      ctx.globalAlpha = alphaAt(u, st);
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      if (s.len <= remain) {
        ctx.lineTo(s.x1, s.y1);
        acc += s.len;
      } else {
        // 段内插值收尾
        const r = remain / s.len;
        ctx.lineTo(s.x0 + (s.x1 - s.x0) * r, s.y0 + (s.y1 - s.y0) * r);
        ctx.stroke();
        break outer;
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function totalTarget(o: OutlineGlyph): number {
  let t = 0;
  for (const c of o.contours) t += c.length;
  return t || 1;
}

/** 阻塞路径守卫：所有三路径均已可用（V1.0 起古文字不再阻塞，IM-GLYPH-001 D-V1-01）。 */
export function isBlockedPath(_path: GlyphPlacement['path']): boolean {
  return false;
}

// ===== 统一逐笔渲染（字体无关；消费 StrokeGlyph，真·按笔顺逐笔） =====
// 坐标：StrokeGlyph.medians 为 y-up 字体坐标（与 getKaiOutline 一致），
// 此处自包含映射到画布（y 翻转 + 居中铺满 glyph 方块），不依赖外部变换实现，便于独立合并与测试。

/**
 * 按笔顺逐笔绘制 StrokeGlyph。progress∈[0,1] 为整字书写完成度；
 * 第 i 笔在区间 [i/n,(i+1)/n] 内按局部进度描绘，笔锋/墨迹浓淡/速度曲线沿用 InkStyle 观感。
 */
export function drawStrokeGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  sg: StrokeGlyph,
  progress: number,
  color: string,
  opts: { lineWidth?: number; style?: Partial<InkStyle> } = {},
): void {
  const n = sg.strokes.length;
  if (n === 0) return;
  const st = inkStyle({ color, ...(opts.style ?? {}) });
  const { x: bx, y: by, w: bw, h: bh } = sg.bbox;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const scale = (glyph.size * 0.92) / Math.max(bw, bh); // 设计单位 → 画布像素
  const gcx = glyph.x + glyph.size / 2;
  const gcy = glyph.y + glyph.size / 2;
  const map = (px: number, py: number): [number, number] => [
    gcx + (px - cx) * scale,
    gcy - (py - cy) * scale, // y-up → y-down 翻转
  ];
  const baseW = opts.lineWidth ?? glyph.size * 0.07;
  const drawn = progress * n; // 已书写的"笔画量"
  ctx.save();
  ctx.strokeStyle = st.color;
  ctx.lineCap = st.round ? 'round' : 'butt';
  ctx.lineJoin = st.round ? 'round' : 'miter';
  for (let i = 0; i < n; i++) {
    const uRaw = i + 1 <= drawn ? 1 : i < drawn ? drawn - i : null;
    if (uRaw === null) continue;
    // 笔内进度先经速度曲线重映射（scribe），再用于描绘长度；笔锋/浓淡按真实位置取
    const u = progressByStyle(uRaw, st.speedCurve);
    const pts = sg.strokes[i].median.map(([x, y]) => map(x, y));
    drawMedian(ctx, pts, u, baseW, st);
  }
  ctx.restore();
}

/** 沿中轴线绘制单笔（可在笔内局部进度 u∈[0,1] 处收尾）；笔锋/墨迹按真实位置调制。 */
function drawMedian(
  ctx: CanvasRenderingContext2D,
  pts: Array<[number, number]>,
  u: number,
  baseW: number,
  st: InkStyle,
): void {
  if (pts.length < 2) return;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  if (total === 0) return;
  const target = total * clamp01(u);
  let acc = 0;
  const prevW = ctx.lineWidth;
  const prevA = ctx.globalAlpha;
  ctx.strokeStyle = st.color;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const segLen = Math.hypot(x1 - x0, y1 - y0);
    if (segLen === 0) continue;
    const remain = target - acc;
    if (remain <= 0) break;
    const local = segLen <= remain ? 1 : remain / segLen;
    const at = (acc + (segLen * local) / 2) / total; // 段中点真实笔内进度
    ctx.lineWidth = baseW * strokeWidthAt(at, st);
    ctx.globalAlpha = alphaAt(at, st);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    if (local >= 1) ctx.lineTo(x1, y1);
    else ctx.lineTo(x0 + (x1 - x0) * local, y0 + (y1 - y0) * local);
    ctx.stroke();
    acc += segLen * local;
    if (local < 1) break;
  }
  ctx.lineWidth = prevW;
  ctx.globalAlpha = prevA;
}
