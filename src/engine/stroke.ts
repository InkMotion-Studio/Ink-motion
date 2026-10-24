// N2.2 笔画引擎
// 楷体 = Hanzi Writer 精确笔顺（消费其笔画中线 medians 做逐笔揭示）；
// 宋体 = 整字显现（fillText，透明度/缩放淡入）；
// 古文字（小篆，V1-C1 D-V1-01）= 受限字库整字显现（按 U+3D000+ 码位 fillText，不承诺笔顺）。
//
// V2 重建：楷体笔画数据改为本地内置（scripts/vendor-hanzi-data.mjs 由 hanzi-writer-data 生成到
// public/hanzi-data/），同源加载 —— 无外部网络请求、不向任何 CDN 泄露"写了哪些字"，
// 契合"文本与项目永不离开浏览器"的零上传承诺（修正了旧版走 jsdelivr 的隐私缺口）。
import type { GlyphPlacement, HanziStrokeData } from './types';
import type { OutlineGlyph, OutlinePoint } from './outline';
import { drawTaperedPolyline, DEFAULT_KAI_INK_STYLE, progressByStyle, type InkStyle } from './draw';
import { getSealFontStack } from '@/lib/seal';
import { getLiFontStack } from '@/lib/lishu';

// 本地同源笔画数据源（由 npm run vendor:hanzi 预生成）。不再引用任何第三方 CDN。
const HANZI_DATA_BASE = '/hanzi-data/';

const dataCache = new Map<string, HanziStrokeData | null>();

/** 加载单字笔画数据；失败返回 null（触发整字降级，IM-TECH-001 §7.1）。 */
export async function loadStrokeData(ch: string): Promise<HanziStrokeData | null> {
  if (dataCache.has(ch)) return dataCache.get(ch) ?? null;
  try {
    const res = await fetch(HANZI_DATA_BASE + encodeURIComponent(ch) + '.json');
    if (!res.ok) throw new Error('no data');
    const data = (await res.json()) as HanziStrokeData;
    dataCache.set(ch, data);
    return data;
  } catch {
    dataCache.set(ch, null); // 记忆缺失，避免重复请求
    if (import.meta.env.DEV) {
      console.warn(`[stroke] 未找到本地笔画数据：${ch}（请先运行 npm run vendor:hanzi）`);
    }
    return null;
  }
}

export function preloadStrokeData(chars: string[]): Promise<void> {
  return Promise.all(chars.map((c) => loadStrokeData(c))).then(() => undefined);
}

// ===== 楷体：逐笔揭示（沿中线绘制带笔锋的圆头笔迹） =====
function strokeLength(med: number[][]): number {
  let len = 0;
  for (let i = 1; i < med.length; i++) {
    len += Math.hypot(med[i][0] - med[i - 1][0], med[i][1] - med[i - 1][1]);
  }
  return len;
}

/**
 * 在 glyph 方块内绘制楷体逐笔。progress∈[0,1] 表示整个字的书写完成度。
 * 每笔沿其真实中线 median 运笔；线宽随笔内进度收细（笔锋）、墨色两端略淡；
 * 单笔内时间经 progressByStyle 重映射，呈现"起笔迟滞→行笔加速→收笔略顿"的书写感。
 */
export function drawKaiGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  data: HanziStrokeData,
  progress: number,
  color: string,
  style: InkStyle = DEFAULT_KAI_INK_STYLE,
): void {
  const S = glyph.size;
  const n = data.medians.length;
  if (n === 0) return;
  const drawn = progress * n; // 已书写的"笔画量"
  ctx.save();
  // Hanzi Writer 数据坐标（1024，y 向上）映射到画布方块（y 向下），保持正立
  ctx.translate(glyph.x, glyph.y + S);
  ctx.scale(S / 1024, -S / 1024);
  ctx.strokeStyle = style.color || color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const baseWidth = 1024 * 0.045 * style.widthRatio; // 约 4.5% em（设计坐标）
  for (let i = 0; i < n; i++) {
    if (i + 1 <= drawn) {
      drawTaperedPolyline(ctx, data.medians[i], 1, baseWidth, style);
    } else if (i < drawn) {
      const f = drawn - i; // 本笔线性进度 [0,1]
      const fStyled = progressByStyle(f, style.speedCurve); // 书写感时间重映射
      drawTaperedPolyline(ctx, data.medians[i], fStyled, baseWidth, style);
    }
  }
  ctx.restore();
}

// ===== 宋体 / 自定义字体：整字显现（淡入） =====
export function drawSongGlyph(
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
  const stack = fontStack ?? '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif';
  ctx.font = `${Math.round(glyph.size * 0.92)}px ${stack}`;
  ctx.fillText(glyph.char, cx, cy);
  ctx.restore();
}

// ===== 受限字库（小篆/隶书）：整字显现（按码位 fillText，整字淡入，不承诺笔顺） =====
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

/** 古文字（小篆）：受限字库整字显现（按小篆码位 fillText）。 */
export function drawSealGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
): void {
  drawRestrictedGlyph(ctx, glyph, progress, color, getSealFontStack());
}

/** 隶书受限字库整字显现（字体栈回退系统隶书族）。 */
export function drawLiGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
): void {
  drawRestrictedGlyph(ctx, glyph, progress, color, getLiFontStack());
}

// ===== 矢量轮廓描边动画（弧长截断，自研 TTF 轮廓） =====
//
// Canvas2D 无 lineDashOffset 的通用「按进度描边」能力（且需与导出帧一致），故采用
// 「按累计弧长截断」策略：沿所有轮廓顺序推进，当累计长度达到 progress×总长时，在最后一段内部插值收尾。

export interface OutlineDrawOptions {
  lineWidth?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
}

const QUAD_SEG = 10;

interface FlatSeg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  len: number;
}

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
  if (prev.x !== points[startIdx].x || prev.y !== points[startIdx].y) {
    push(prev.x, prev.y, points[startIdx].x, points[startIdx].y);
  }
  return segs;
}

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

  const S = glyph.size;
  const upm = outline.unitsPerEm || 1024;
  const gw = Math.max(1, outline.xMax - outline.xMin);
  const gh = Math.max(1, outline.yMax - outline.yMin);
  const scale = (S * 0.92) / Math.max(gw, gh);

  ctx.save();
  ctx.translate(glyph.x + S / 2, glyph.y + S / 2);
  ctx.scale(scale / upm, -scale / upm);
  ctx.translate(-(outline.xMin + gw / 2), -(outline.yMin + gh / 2));

  ctx.strokeStyle = color;
  ctx.lineWidth = opts.lineWidth ?? upm * 0.045;
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
        ctx.moveTo(s.x0, s.y0);
        ctx.lineTo(s.x1, s.y1);
        acc += s.len;
      } else {
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
