// N2.2 笔画引擎
// 楷体 = Hanzi Writer 精确笔顺（消费其笔画中线 medians 做逐笔揭示）；
// 宋体 = 整字显现（fillText，透明度/缩放淡入）；
// 古文字（小篆，V1-C1 D-V1-01）= 受限字库整字显现（按 U+3D000+ 码位 fillText，不承诺笔顺）。
import type { GlyphPlacement, HanziStrokeData } from './types';
import type { OutlineGlyph, OutlinePoint } from './outline';
import { getSealFontStack } from '@/lib/seal';
import { getLiFontStack } from '@/lib/lishu';

const HW_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';
const STROKE_WIDTH = 70; // 1024 坐标空间内的笔宽（约为字面 7%）

const dataCache = new Map<string, HanziStrokeData | null>();

/** 加载单字笔画数据；失败返回 null（触发整字降级，IM-TECH-001 §7.1）。 */
export async function loadStrokeData(ch: string): Promise<HanziStrokeData | null> {
  if (dataCache.has(ch)) return dataCache.get(ch) ?? null;
  try {
    const res = await fetch(HW_CDN + encodeURIComponent(ch) + '.json');
    if (!res.ok) throw new Error('no data');
    const data = (await res.json()) as HanziStrokeData;
    dataCache.set(ch, data);
    return data;
  } catch {
    dataCache.set(ch, null); // 记忆缺失，避免重复请求
    return null;
  }
}

export function preloadStrokeData(chars: string[]): Promise<void> {
  return Promise.all(chars.map((c) => loadStrokeData(c))).then(() => undefined);
}

// ===== 楷体：逐笔揭示（沿中线绘制圆头笔迹） =====
function strokeLength(med: number[][]): number {
  let len = 0;
  for (let i = 1; i < med.length; i++) {
    len += Math.hypot(med[i][0] - med[i - 1][0], med[i][1] - med[i - 1][1]);
  }
  return len;
}

function drawMedianFull(ctx: CanvasRenderingContext2D, med: number[][]) {
  if (med.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(med[0][0], med[0][1]);
  for (let i = 1; i < med.length; i++) ctx.lineTo(med[i][0], med[i][1]);
  ctx.stroke();
}

function drawMedianPartial(ctx: CanvasRenderingContext2D, med: number[][], frac: number) {
  if (med.length === 0 || frac <= 0) return;
  const total = strokeLength(med);
  const target = total * Math.min(1, frac);
  ctx.beginPath();
  ctx.moveTo(med[0][0], med[0][1]);
  let acc = 0;
  for (let i = 1; i < med.length; i++) {
    const segLen = Math.hypot(med[i][0] - med[i - 1][0], med[i][1] - med[i - 1][1]);
    if (acc + segLen >= target) {
      const remain = target - acc;
      const r = segLen === 0 ? 0 : remain / segLen;
      ctx.lineTo(
        med[i - 1][0] + (med[i][0] - med[i - 1][0]) * r,
        med[i - 1][1] + (med[i][1] - med[i - 1][1]) * r,
      );
      break;
    }
    acc += segLen;
    ctx.lineTo(med[i][0], med[i][1]);
  }
  ctx.stroke();
}

/** 在 glyph 方块内绘制楷体逐笔。progress∈[0,1] 表示整个字的书写完成度。 */
export function drawKaiGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  data: HanziStrokeData,
  progress: number,
  color: string,
) {
  const S = glyph.size;
  const n = data.medians.length;
  if (n === 0) return;
  const drawn = progress * n; // 已书写的"笔画量"
  ctx.save();
  // Hanzi Writer 数据坐标（1024，y 向上）映射到画布方块（y 向下），保持正立
  ctx.translate(glyph.x, glyph.y + S);
  ctx.scale(S / 1024, -S / 1024);
  ctx.strokeStyle = color;
  ctx.lineWidth = STROKE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    if (i + 1 <= drawn) {
      drawMedianFull(ctx, data.medians[i]);
    } else if (i < drawn) {
      drawMedianPartial(ctx, data.medians[i], drawn - i);
    }
  }
  ctx.restore();
}

// ===== 宋体 / 自定义字体：整字显现（淡入） =====
/**
 * V2-C4 N4.1：fontStack 可选。传入时使用调用方字体栈（内置宋体 / 用户上传字体 / 内置毛笔体），
 * 缺省沿用宋体栈以保持既有行为（向后兼容）。
 */
export function drawSongGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
  fontStack?: string,
) {
  if (progress <= 0) return;
  const cx = glyph.x + glyph.size / 2;
  const cy = glyph.y + glyph.size / 2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, progress);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const stack = fontStack ?? '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif';
  ctx.font = `${Math.round(glyph.size * 0.92)}px ${stack}`;
  ctx.fillText(glyph.char, cx, cy);
  ctx.restore();
}

// ===== 受限字库（小篆/隶书）：整字显现（按码位 fillText，整字淡入，不承诺笔顺） =====
/**
 * V2-C2 N2.2：受限字库通用整字显现（seal/li 复用）。
 * fontStack 由调用方传入（小篆用 getSealFontStack，隶书用 getLiFontStack）。
 */
export function drawRestrictedGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
  fontStack?: string,
): void {
  if (progress <= 0) return;
  const cx = glyph.x + glyph.size / 2;
  const cy = glyph.y + glyph.size / 2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, progress);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(glyph.size * 0.95)}px ${fontStack ?? 'serif'}`;
  ctx.fillText(glyph.char, cx, cy);
  ctx.restore();
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
}

const QUAD_SEG = 10; // 二次贝塞尔采样段数（弧长推进精度）

interface FlatSeg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
}

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
 * 沿字形轮廓描绘显现（V2-C2 N2.3）。
 * progress∈[0,1] 表示轮廓累计描绘完成度；仅对约 2% 的残余长度内插收尾。
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

  // 设计坐标 → 画布方块映射（y 向上翻转为 y 向下，保持正立）
  const S = glyph.size;
  const upm = outline.unitsPerEm || 1024;
  // 以字体设计框居中适配方块（留 4% 边距）
  const gw = Math.max(1, outline.xMax - outline.xMin);
  const gh = Math.max(1, outline.yMax - outline.yMin);
  const scale = (S * 0.92) / Math.max(gw, gh);

  ctx.save();
  ctx.translate(glyph.x + S / 2, glyph.y + S / 2);
  ctx.scale(scale / upm, -scale / upm);
  ctx.translate(-(outline.xMin + gw / 2), -(outline.yMin + gh / 2));

  ctx.strokeStyle = color;
  ctx.lineWidth = opts.lineWidth ?? upm * 0.045; // 约 4.5% em（设计坐标）
  ctx.lineCap = opts.lineCap ?? 'round';
  ctx.lineJoin = opts.lineJoin ?? 'round';

  const total = totalTarget(outline);
  const target = Math.min(1, progress) * total;
  ctx.beginPath();
  let acc = 0;
  outer: for (const contour of contours) {
    const segs = flattenContour(contour.points);
    for (const s of segs) {
      if (s.len === 0) continue;
      const remain = target - acc;
      if (remain <= 0) break outer;
      if (s.len <= remain) {
        // 整段绘制
        ctx.moveTo(s.x0, s.y0);
        ctx.lineTo(s.x1, s.y1);
        acc += s.len;
      } else {
        // 段内插值收尾
        const r = remain / s.len;
        ctx.moveTo(s.x0, s.y0);
        ctx.lineTo(s.x0 + (s.x1 - s.x0) * r, s.y0 + (s.y1 - s.y0) * r);
        acc = target;
        break outer;
      }
    }
  }
  ctx.stroke();
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
