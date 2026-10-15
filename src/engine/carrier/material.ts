// V2-C7 C6：通用材质基元
//
// 设计目标：把「一张色块 + 几根线」升级为「多层材质合成」，且全部为零依赖程序化绘制。
// 所有基元都接受确定性 seed，保证预览与导出帧完全一致（无逐帧抖动）。
//
// 层次约定（由插件组合调用）：
//   1. baseFill      底材色（含色温）
//   2. fiberWeave    纤维交织（双向）
//   3. laidLines     帘纹（宣纸特征）
//   4. grain         细颗粒（实物感）
//   5. edgeStain     边缘洇色/氧化
//   6. vignette      暗角
//   7. softShadow    载体浮起投影
//   8. sealHint      钤印位预留

import { applyWarmth, fbm2, hash2, mulberry32, noise1, rgba, shade } from './noise';
import type { ResolvedParams, SealPos } from './types';

export interface LayerCtx {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  p: ResolvedParams;
}

/** 底材填充（应用色温）。 */
export function baseFill(ctx: CanvasRenderingContext2D, w: number, h: number, p: ResolvedParams): void {
  ctx.fillStyle = applyWarmth(p.backgroundColor, p.warmth);
  ctx.fillRect(0, 0, w, h);
}

/**
 * 纤维交织层：水平 + 垂直双向短纤维（宣纸/绢帛的纸筋与丝缕）。
 * @param density 每 100px 的纤维条数（6~24）
 */
export function fiberWeave(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ResolvedParams,
  density = 12,
  opts: { horizontal?: boolean; vertical?: boolean; alpha?: number } = {},
): void {
  const { horizontal = true, vertical = true, alpha = 0.05 } = opts;
  const rnd = mulberry32(p.seed ^ 0x5eed);
  const count = Math.max(20, Math.round((density * w) / 100));
  ctx.save();
  ctx.lineWidth = 1;

  if (vertical) {
    ctx.strokeStyle = rgba(shade(p.backgroundColor, -0.25), alpha * 1.6);
    for (let i = 0; i < count; i++) {
      const x = rnd() * w;
      const y0 = rnd() * h;
      const len = h * (0.25 + rnd() * 0.75);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      // 轻微弯曲使纤维自然
      ctx.quadraticCurveTo(x + (rnd() - 0.5) * 6, y0 + len / 2, x + (rnd() - 0.5) * 4, y0 + len);
      ctx.stroke();
    }
  }
  if (horizontal) {
    ctx.strokeStyle = rgba(shade(p.backgroundColor, -0.18), alpha);
    const hCount = Math.max(20, Math.round((density * h) / 100));
    for (let i = 0; i < hCount; i++) {
      const y = rnd() * h;
      const x0 = rnd() * w;
      const len = w * (0.2 + rnd() * 0.6);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + len, y + (rnd() - 0.5) * 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * 帘纹层（宣纸抄造痕迹）：等距浅横痕 + 稀疏竖帘线，附轻微不匀。
 * @param pitch 横痕间距（px），宣纸约 26~40
 */
export function laidLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ResolvedParams,
  pitch = 32,
): void {
  ctx.save();
  const dark = rgba(shade(p.backgroundColor, -0.3), 0.06 + 0.04 * p.aging);
  const light = rgba(shade(p.backgroundColor, 0.5), 0.05);
  ctx.lineWidth = 1;
  for (let y = pitch; y < h; y += pitch) {
    // 每道帘痕由两像素亮暗成对，形成微微起伏
    const jitter = (noise1(y / pitch, p.seed) - 0.5) * 2;
    ctx.strokeStyle = dark;
    ctx.beginPath();
    ctx.moveTo(0, y + jitter);
    ctx.lineTo(w, y + jitter);
    ctx.stroke();
    ctx.strokeStyle = light;
    ctx.beginPath();
    ctx.moveTo(0, y + jitter + 1.5);
    ctx.lineTo(w, y + jitter + 1.5);
    ctx.stroke();
  }
  // 稀疏竖帘线（抄纸帘的编织经线）
  const cols = Math.max(4, Math.round(w / (pitch * 4)));
  ctx.strokeStyle = rgba(shade(p.backgroundColor, -0.35), 0.05);
  for (let i = 0; i < cols; i++) {
    const x = ((i + 0.5) * w) / cols + (noise1(i * 3.1, p.seed + 7) - 0.5) * 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 颗粒层：细密噪点（fbm），给所有程序化材质加「实物」的微观不匀。
 * @param strength 0~1
 */
export function grain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ResolvedParams,
  strength = 0.5,
): void {
  const step = 3; // 采样步长（px）
  ctx.save();
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const n = fbm2(x / 48, y / 48, p.seed, 3);
      const v = (n - 0.5) * strength * 0.16;
      if (Math.abs(v) < 0.006) continue;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      ctx.fillRect(x, y, step, step);
    }
  }
  ctx.restore();
}

/** 边缘洇色 / 氧化：四周不规则暗边（纸寿千年之「包浆」）。 */
export function edgeStain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ResolvedParams,
  thickness = 0.06,
): void {
  const t = Math.max(4, Math.round(Math.min(w, h) * thickness));
  ctx.save();
  const col = shade(p.backgroundColor, -0.45);
  // 四边渐变
  const edges: [number, number, number, number, number, number, number, number][] = [
    [0, 0, 0, t, 0, 0, 0, t], // 上
    [0, h, 0, h - t, 0, h, 0, h - t], // 下
    [0, 0, t, 0, 0, 0, t, 0], // 左
    [w, 0, w - t, 0, w, 0, w - t, 0], // 右
  ];
  for (const [gx0, gy0, gx1, gy1] of edges) {
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, rgba(col, 0.22 + 0.25 * p.aging));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  // 随机斑驳（老化越强越多）
  const rnd = mulberry32(p.seed ^ 0xb10b);
  const spots = Math.round(6 + 26 * p.aging);
  for (let i = 0; i < spots; i++) {
    const cx = rnd() * w;
    const cy = rnd() * h;
    const r = 3 + rnd() * (Math.min(w, h) * 0.045);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(col, (0.05 + 0.12 * p.aging) * (0.5 + rnd())));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** 暗角（vignette）：轻微四周压暗，聚焦中部文字。 */
export function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, p: ResolvedParams, strength = 0.16): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(20,14,6,${strength * (0.6 + 0.6 * p.aging)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** 载体浮起投影（解决「扁平贴图」感）：内侧四周渐影。 */
export function softShadow(ctx: CanvasRenderingContext2D, w: number, h: number, depth = 0.03): void {
  const d = Math.max(6, Math.round(Math.min(w, h) * depth));
  const edges: [number, number, number, number][] = [
    [0, 0, 0, d],
    [0, h, 0, h - d],
    [0, 0, d, 0],
    [w, 0, w - d, 0],
  ];
  ctx.save();
  for (const [x0, y0, x1, y1] of edges) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x1) === 0 ? 0 : w - d, Math.min(y0, y1) === 0 ? 0 : h - d, Math.min(x0, x1) === 0 ? w : d, Math.min(y0, y1) === 0 ? h : d);
  }
  ctx.restore();
}

/** 单个径向雾斑（做旧/渗色/高光通用）。 */
export function blob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha: number,
): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, r));
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/**
 * 钤印位预留：在指定角落绘制朱色方框弱痕（不生成印文，属预留位）。
 */
export function sealHint(ctx: CanvasRenderingContext2D, w: number, h: number, pos: SealPos, size = 0.085): void {
  if (pos === 'none') return;
  const s = Math.round(Math.min(w, h) * size);
  const pad = Math.round(Math.min(w, h) * 0.055);
  const x = pos === 'tl' || pos === 'bl' ? pad : w - pad - s;
  const y = pos === 'tl' || pos === 'tr' ? pad : h - pad - s;
  ctx.save();
  ctx.fillStyle = rgba('#b23a2e', 0.12);
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = rgba('#b23a2e', 0.5);
  ctx.lineWidth = Math.max(1, Math.round(s * 0.06));
  ctx.strokeRect(x, y, s, s);
  // 内框（印章的双边框感）
  ctx.strokeRect(x + s * 0.14, y + s * 0.14, s * 0.72, s * 0.72);
  ctx.restore();
}

/** 便捷：一次性绘制全部「纸质通用层」。 */
export function paperLayers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: ResolvedParams,
  opts: { laid?: boolean; pitch?: number; fiberDensity?: number; grainStrength?: number } = {},
): void {
  baseFill(ctx, w, h, p);
  fiberWeave(ctx, w, h, p, opts.fiberDensity ?? 12);
  if (opts.laid !== false) laidLines(ctx, w, h, p, opts.pitch ?? 32);
  grain(ctx, w, h, p, opts.grainStrength ?? 0.5);
}

/** 内部复用：按坐标取稳定随机（部分插件需要逐片变化）。 */
export { hash2, noise1, mulberry32 };
