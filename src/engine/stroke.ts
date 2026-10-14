// N2.2 笔画引擎
// 楷体 = Hanzi Writer 精确笔顺（消费其笔画中线 medians 做逐笔揭示）；
// 宋体 = 整字显现（fillText，透明度/缩放淡入）；
// 古文字（小篆，V1-C1 D-V1-01）= 受限字库整字显现（按 U+3D000+ 码位 fillText，不承诺笔顺）。
import type { GlyphPlacement, HanziStrokeData } from './types';
import { SEAL_FONT_FAMILY } from '@/lib/seal';

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

// ===== 宋体：整字显现（淡入） =====
export function drawSongGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
) {
  if (progress <= 0) return;
  const cx = glyph.x + glyph.size / 2;
  const cy = glyph.y + glyph.size / 2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, progress);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(glyph.size * 0.92)}px "Source Han Serif SC", "Noto Serif SC", "Songti SC", "SimSun", serif`;
  ctx.fillText(glyph.char, cx, cy);
  ctx.restore();
}

// ===== 古文字（小篆）：受限字库整字显现（按小篆码位 fillText，整字淡入） =====
export function drawSealGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  progress: number,
  color: string,
): void {
  if (progress <= 0) return;
  const cx = glyph.x + glyph.size / 2;
  const cy = glyph.y + glyph.size / 2;
  ctx.save();
  ctx.globalAlpha = Math.min(1, progress);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 使用注册的小篆字体；glyph.char 已是被映射为小篆码位的字符（见 scene.ts）
  ctx.font = `${Math.round(glyph.size * 0.95)}px "${SEAL_FONT_FAMILY}", "Songti SC", "SimSun", serif`;
  ctx.fillText(glyph.char, cx, cy);
  ctx.restore();
}

/** 阻塞路径守卫：所有三路径均已可用（V1.0 起古文字不再阻塞，IM-GLYPH-001 D-V1-01）。 */
export function isBlockedPath(_path: GlyphPlacement['path']): boolean {
  return false;
}
