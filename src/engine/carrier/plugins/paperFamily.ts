// V2-C7 C6：纸质类载体插件（宣纸卷轴 / 绢帛 / 信笺 / 洒金笺）
//
// 每题按「底材 → 纹理 → 结构件 → 老化 → 投影 → 钤印位」分层，避免单层平涂。

import { applyWarmth, mulberry32, rgba, shade } from '../noise';
import {
  blob,
  edgeStain,
  grain,
  paperLayers,
  sealHint,
  softShadow,
  vignette,
} from '../material';
import { resolveParams } from '../types';
import type { CarrierPlugin } from '../types';

/** 装裱边（绫边）：四边色带 + 内外描线，是所有卷轴/立轴形制的通用结构件。 */
function mountBorder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  pixel: number,
  warmth: number,
  innerColor?: string,
): { x: number; y: number; w: number; h: number } {
  const m = Math.max(6, Math.round(pixel));
  // 绫边填充
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, applyWarmth(shade(base, -0.12), warmth));
  g.addColorStop(0.5, applyWarmth(shade(base, 0.06), warmth));
  g.addColorStop(1, applyWarmth(shade(base, -0.16), warmth));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, m);
  ctx.fillRect(0, h - m, w, m);
  ctx.fillRect(0, 0, m, h);
  ctx.fillRect(w - m, 0, m, h);
  // 绫边暗纹（织物走向）
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#3a2a18';
  ctx.lineWidth = 1;
  for (let y = 2; y < h; y += 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
  // 内外描线
  ctx.strokeStyle = rgba(innerColor ?? '#8a6a3a', 0.55);
  ctx.lineWidth = Math.max(1, Math.round(m * 0.16));
  ctx.strokeRect(m * 0.5, m * 0.5, w - m, h - m);
  ctx.strokeStyle = rgba('#5a4020', 0.5);
  ctx.strokeRect(m, m, w - m * 2, h - m * 2);
  return { x: m, y: m, w: w - m * 2, h: h - m * 2 };
}

/** 卷轴轴杆（上下）。 */
function axisBar(ctx: CanvasRenderingContext2D, w: number, y: number, barH: number, warm: number): void {
  const g = ctx.createLinearGradient(0, y, 0, y + barH);
  g.addColorStop(0, applyWarmth('#6d4f2c', warm));
  g.addColorStop(0.32, applyWarmth('#a8874f', warm));
  g.addColorStop(0.55, applyWarmth('#c9a86a', warm));
  g.addColorStop(1, applyWarmth('#6a4a26', warm));
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, barH);
  // 两端轴头
  const cap = Math.max(10, Math.round(barH * 1.5));
  for (const cx of [0, w - cap]) {
    const cg = ctx.createLinearGradient(cx, y, cx + cap, y + barH);
    cg.addColorStop(0, applyWarmth('#4a3419', warm));
    cg.addColorStop(0.5, applyWarmth('#b08e55', warm));
    cg.addColorStop(1, applyWarmth('#4a3419', warm));
    ctx.fillStyle = cg;
    ctx.fillRect(cx, y - barH * 0.22, cap, barH * 1.44);
  }
}

// ===== 1. 宣纸卷轴 =====
export const paper: CarrierPlugin = {
  type: 'paper',
  label: '宣纸卷轴',
  usesBackground: true,
  render(ctx, w, h, raw) {
    const p = resolveParams(raw, { seed: 20261013 });
    paperLayers(ctx, w, h, p, { pitch: 34, fiberDensity: 14, grainStrength: 0.55 });
    vignette(ctx, w, h, p, 0.12);
    // 内框 + 上下轴杆（保持旧版形制特征）
    ctx.strokeStyle = rgba('#78644a', 0.35);
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    const barH = Math.max(18, Math.round(h * 0.018));
    axisBar(ctx, w, 0, barH, p.warmth);
    axisBar(ctx, w, h - barH, barH, p.warmth);
    softShadow(ctx, w, h, 0.02);
    sealHint(ctx, w, h, p.sealPos);
  },
};

// ===== 3. 绢帛 =====
export const silk: CarrierPlugin = {
  type: 'silk',
  label: '绢帛',
  usesBackground: true,
  supportsMount: true,
  render(ctx, w, h, raw) {
    const p = resolveParams(raw, { seed: 20261021, aging: 0.25 });
    const base = applyWarmth(p.backgroundColor, p.warmth);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // 绢纹：经纬细密交织（比宣纸纤维更规则、更亮）
    const rnd = mulberry32(p.seed ^ 0x51c);
    ctx.save();
    ctx.lineWidth = 1;
    const step = Math.max(3, Math.round(Math.min(w, h) * 0.006));
    for (let y = 0; y < h; y += step) {
      ctx.strokeStyle = rgba(shade(p.backgroundColor, 0.45), 0.055);
      ctx.beginPath();
      ctx.moveTo(0, y + (rnd() - 0.5));
      ctx.lineTo(w, y + (rnd() - 0.5));
      ctx.stroke();
    }
    for (let x = 0; x < w; x += step) {
      ctx.strokeStyle = rgba(shade(p.backgroundColor, -0.3), 0.045);
      ctx.beginPath();
      ctx.moveTo(x + (rnd() - 0.5), 0);
      ctx.lineTo(x + (rnd() - 0.5), h);
      ctx.stroke();
    }
    ctx.restore();
    // 丝光泽：斜向柔光带（绢面反射特征）
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.42, 'rgba(255,252,240,0.16)');
    sheen.addColorStop(0.58, 'rgba(255,252,240,0.1)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    grain(ctx, w, h, p, 0.35);
    edgeStain(ctx, w, h, p, 0.05);
    vignette(ctx, w, h, p, 0.14);
    softShadow(ctx, w, h, 0.025);
    sealHint(ctx, w, h, p.sealPos);
  },
};

// ===== 4. 信笺 =====
export const letter: CarrierPlugin = {
  type: 'letter',
  label: '信笺',
  usesBackground: true,
  render(ctx, w, h, raw) {
    const p = resolveParams(raw, { seed: 20261022, aging: 0.3 });
    paperLayers(ctx, w, h, p, { pitch: 40, fiberDensity: 10, grainStrength: 0.4 });
    // 朱丝栏：竖向行格（信笺标志性结构件）
    const margin = Math.max(18, Math.round(w * 0.075));
    const cols = 8;
    const innerW = w - margin * 2;
    const gap = innerW / cols;
    ctx.save();
    ctx.strokeStyle = rgba('#b3563f', 0.34);
    ctx.lineWidth = 1.4;
    for (let i = 0; i <= cols; i++) {
      const x = margin + gap * i;
      ctx.beginPath();
      ctx.moveTo(x, margin * 0.6);
      ctx.lineTo(x, h - margin * 0.6);
      ctx.stroke();
    }
    // 外框（略粗）
    ctx.lineWidth = 2.4;
    ctx.strokeRect(margin, margin * 0.6, innerW, h - margin * 1.2);
    // 抬头横线（界格）
    ctx.lineWidth = 1.2;
    for (const yy of [margin * 0.6 + (h - margin * 1.2) * 0.12, h - margin * 0.6 - (h - margin * 1.2) * 0.1]) {
      ctx.beginPath();
      ctx.moveTo(margin, yy);
      ctx.lineTo(margin + innerW, yy);
      ctx.stroke();
    }
    ctx.restore();
    // 角部淡色印花（笺纸装饰）
    blob(ctx, margin * 1.5, h - margin * 1.6, Math.min(w, h) * 0.09, '#9d7a52', 0.1);
    blob(ctx, w - margin * 1.5, margin * 1.4, Math.min(w, h) * 0.06, '#9d7a52', 0.08);
    edgeStain(ctx, w, h, p, 0.045);
    vignette(ctx, w, h, p, 0.13);
    softShadow(ctx, w, h, 0.022);
    sealHint(ctx, w, h, p.sealPos);
  },
};

// ===== 5. 洒金笺 =====
export const gold: CarrierPlugin = {
  type: 'gold',
  label: '洒金笺',
  usesBackground: true,
  render(ctx, w, h, raw) {
    const p = resolveParams(raw, { seed: 20261023, aging: 0.28 });
    paperLayers(ctx, w, h, p, { pitch: 36, fiberDensity: 12, grainStrength: 0.45 });
    // 金箔碎片：确定性随机位置 + 大小 + 形状（三角/矩形/碎屑）
    const rnd = mulberry32(p.seed ^ 0x901d);
    const count = Math.round((w * h) / 5200) + 30;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const cx = rnd() * w;
      const cy = rnd() * h;
      const s = 2 + rnd() * Math.min(w, h) * 0.012;
      const rot = rnd() * Math.PI;
      const kind = rnd();
      const alpha = 0.35 + rnd() * 0.5;
      const g = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
      g.addColorStop(0, `rgba(214,178,92,${alpha})`);
      g.addColorStop(0.5, `rgba(246,225,160,${alpha})`);
      g.addColorStop(1, `rgba(176,138,58,${alpha})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      if (kind < 0.5) {
        // 方形箔片
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.rect(-s / 2, -s / 2, s, s);
        ctx.rotate(-rot);
        ctx.translate(-cx, -cy);
      } else if (kind < 0.82) {
        // 三角碎屑
        const p1x = cx + (rnd() - 0.5) * s * 1.8;
        const p1y = cy + (rnd() - 0.5) * s * 1.8;
        ctx.moveTo(cx, cy);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(cx + (rnd() - 0.5) * s * 1.8, cy + (rnd() - 0.5) * s * 1.8);
        ctx.closePath();
      } else {
        // 细碎金粉
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
      }
      ctx.fill();
      // 箔片高光
      if (rnd() > 0.6) {
        ctx.fillStyle = `rgba(255,250,225,${alpha * 0.55})`;
        ctx.fillRect(cx - s * 0.12, cy - s * 0.12, Math.max(1, s * 0.16), Math.max(1, s * 0.16));
      }
    }
    ctx.restore();
    vignette(ctx, w, h, p, 0.15);
    softShadow(ctx, w, h, 0.024);
    sealHint(ctx, w, h, p.sealPos);
  },
};

export { mountBorder, axisBar };
