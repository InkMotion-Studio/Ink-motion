// V2-C7 C6：裱装与异形载体插件（立轴 / 手卷 / 团扇）
//
// 特征：具备真实中国装裱形制——天头地脚、引首拖尾、扇骨扇面。

import { applyWarmth, hash2, rgba, shade } from '../noise';
import {
  blob,
  fiberWeave,
  grain,
  laidLines,
  sealHint,
  softShadow,
  vignette,
} from '../material';
import { axisBar, mountBorder } from './paperFamily';
import { resolveParams } from '../types';
import type { CarrierPlugin } from '../types';

/** 裱装内芯（宣纸心子）：供立轴/手卷复用。 */
function innerPaper(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  params: ReturnType<typeof resolveParams>,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // 心子底 + 纤维 + 帘纹（在心子范围内）
  ctx.translate(x, y);
  ctx.fillStyle = applyWarmth(params.backgroundColor, params.warmth);
  ctx.fillRect(0, 0, w, h);
  laidLines(ctx, w, h, params, 30);
  ctx.restore();
}

// ===== 8. 立轴 =====
export const scroll: CarrierPlugin = {
  type: 'scroll',
  label: '立轴',
  usesBackground: true,
  supportsMount: true,
  render(ctx, w, h, raw) {
    const p = resolveParams(raw, { seed: 20261026, aging: 0.32 });
    if (raw.seed === undefined) p.seed = 20261026;
    const mount = Math.max(10, Math.round((raw.mountRatio ?? 0.075) * Math.min(w, h)));

    // 外层绫边底
    ctx.fillStyle = applyWarmth(shade('#b9a06a', -0.05), p.warmth);
    ctx.fillRect(0, 0, w, h);

    // 天头 / 地脚（明显大于左右边，是立轴典型比例）
    const skyH = Math.round(mount * 1.9);
    const earthH = Math.round(mount * 1.7);
    const sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0, applyWarmth('#a98f57', p.warmth));
    sky.addColorStop(1, applyWarmth('#c4ab74', p.warmth));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, skyH);
    const earth = ctx.createLinearGradient(0, h - earthH, 0, h);
    earth.addColorStop(0, applyWarmth('#c4ab74', p.warmth));
    earth.addColorStop(1, applyWarmth('#a98f57', p.warmth));
    ctx.fillStyle = earth;
    ctx.fillRect(0, h - earthH, w, earthH);

    // 左右绫边
    ctx.fillStyle = applyWarmth('#bda471', p.warmth);
    ctx.fillRect(0, skyH, mount, h - skyH - earthH);
    ctx.fillRect(w - mount, skyH, mount, h - skyH - earthH);

    // 绫边织纹
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.strokeStyle = '#4a3618';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // 内芯（心子）区域
    const ix = mount;
    const iy = skyH;
    const iw = w - mount * 2;
    const ih = h - skyH - earthH;

    // 心子外投影（心子高于绫边）
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.32)';
    ctx.shadowBlur = Math.max(6, Math.round(mount * 0.8));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(ix, iy, iw, ih);
    ctx.restore();

    innerPaper(ctx, ix, iy, iw, ih, p);
    fiberWeaveAt(ctx, ix, iy, iw, ih, p);

    // 心子与绫边的分界描线
    ctx.strokeStyle = rgba('#6b5228', 0.6);
    ctx.lineWidth = Math.max(1, Math.round(mount * 0.1));
    ctx.strokeRect(ix, iy, iw, ih);

    // 上下轴杆
    const barH = Math.max(14, Math.round(h * 0.016));
    axisBar(ctx, w, 0, barH, p.warmth);
    axisBar(ctx, w, h - barH, barH, p.warmth);

    grain(ctx, w, h, p, 0.35);
    vignette(ctx, w, h, p, 0.16);
    softShadow(ctx, w, h, 0.02);
    sealHint(ctx, w, h, p.sealPos);
  },
};

/** 在心子区域内绘制纤维（需裁剪到内芯）。 */
function fiberWeaveAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  p: ReturnType<typeof resolveParams>,
): void {
  const saved = { ...p };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x, y);
  fiberWeave(ctx, w, h, saved, 12, { alpha: 0.05 });
  ctx.restore();
}

// ===== 9. 手卷 =====
export const handscroll: CarrierPlugin = {
  type: 'handscroll',
  label: '手卷',
  usesBackground: true,
  supportsMount: true,
  render(ctx, w, h, raw) {
    const p = resolveParams(raw, { seed: 20261027, aging: 0.34 });
    const border = Math.max(8, Math.round((raw.mountRatio ?? 0.05) * Math.min(w, h)));

    // 卷面底（裱绫）
    ctx.fillStyle = applyWarmth(shade('#b39a63', -0.02), p.warmth);
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#4a3618';
    for (let x = 0; x < w; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.restore();

    // 引首（左段）+ 拖尾（右段）+ 中间画心，三段比例近似真实手卷
    const leadW = Math.round(w * 0.16);
    const tailW = Math.round(w * 0.14);
    const coreX = leadW;
    const coreW = w - leadW - tailW;

    // 引首（题签位：略深色 + 长条题签）
    ctx.fillStyle = applyWarmth('#a68c58', p.warmth);
    ctx.fillRect(0, 0, leadW, h);
    const tagH = Math.round(h * 0.5);
    const tagW = Math.round(leadW * 0.34);
    ctx.fillStyle = rgba('#5c4522', 0.22);
    ctx.fillRect(Math.round(leadW * 0.3), Math.round((h - tagH) / 2), tagW, tagH);
    ctx.strokeStyle = rgba('#3f2f14', 0.4);
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(leadW * 0.3), Math.round((h - tagH) / 2), tagW, tagH);

    // 拖尾
    ctx.fillStyle = applyWarmth('#a68c58', p.warmth);
    ctx.fillRect(w - tailW, 0, tailW, h);

    // 画心
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = Math.max(5, Math.round(border * 0.9));
    ctx.fillStyle = '#000';
    ctx.fillRect(coreX, border, coreW, h - border * 2);
    ctx.restore();
    innerPaper(ctx, coreX, border, coreW, h - border * 2, p);
    fiberWeaveAt(ctx, coreX, border, coreW, h - border * 2, p);

    // 画心上下界格线（手卷常见）
    ctx.strokeStyle = rgba('#6b5228', 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(coreX, border);
    ctx.lineTo(coreX, h - border);
    ctx.moveTo(coreX + coreW, border);
    ctx.lineTo(coreX + coreW, h - border);
    ctx.stroke();

    // 左右卷边阴影（卷起感）
    const lg = ctx.createLinearGradient(0, 0, border * 4, 0);
    lg.addColorStop(0, 'rgba(30,20,8,0.42)');
    lg.addColorStop(1, 'rgba(30,20,8,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, border * 4, h);
    const rg = ctx.createLinearGradient(w, 0, w - border * 4, 0);
    rg.addColorStop(0, 'rgba(30,20,8,0.42)');
    rg.addColorStop(1, 'rgba(30,20,8,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(w - border * 4, 0, border * 4, h);

    grain(ctx, w, h, p, 0.32);
    vignette(ctx, w, h, p, 0.18);
    sealHint(ctx, w, h, p.sealPos);
  },
};

// ===== 10. 团扇 =====
export const fan: CarrierPlugin = {
  type: 'fan',
  label: '团扇',
  usesBackground: true,
  render(ctx, w, h, raw) {
    const p = resolveParams(raw, { seed: 20261028, aging: 0.3 });
    // 扇外底色（深色背景，衬托扇面）
    ctx.fillStyle = applyWarmth(shade('#2f2a22', -0.1), p.warmth * 0.4);
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.47;
    const R = Math.min(w, h) * 0.42;

    // 扇面投影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = Math.round(R * 0.14);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.restore();

    // 扇面主体（绢/纸）
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = applyWarmth(p.backgroundColor, p.warmth);
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // 绢纹
    fiberWeave(ctx, w, h, p, 10, { alpha: 0.045 });
    // 放射折痕（扇骨支撑形成的褶线）
    const ribs = 14;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < ribs; i++) {
      const a = (i / ribs) * Math.PI * 2;
      const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.addColorStop(0, 'rgba(90,68,34,0.4)');
      g.addColorStop(0.35, 'rgba(90,68,34,0)');
      g.addColorStop(0.65, 'rgba(255,248,226,0.18)');
      g.addColorStop(1, 'rgba(90,68,34,0.28)');
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 中心留白晕（扇面中部的柔和过渡）
    blob(ctx, cx, cy, R * 0.9, '#fffaf0', 0.16);
    grain(ctx, w, h, p, 0.4);
    vignette(ctx, w, h, p, 0.24);
    ctx.restore();

    // 扇框：双层描边（竹/木骨边）
    ctx.strokeStyle = rgba('#6d4f2c', 0.9);
    ctx.lineWidth = Math.max(2, R * 0.028);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba('#c9a86a', 0.75);
    ctx.lineWidth = Math.max(1, R * 0.014);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.968, 0, Math.PI * 2);
    ctx.stroke();

    // 扇柄（向下延伸）
    const hw = R * 0.075;
    const hg = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
    hg.addColorStop(0, '#5a4020');
    hg.addColorStop(0.5, '#b0904f');
    hg.addColorStop(1, '#5a4020');
    ctx.fillStyle = hg;
    ctx.fillRect(cx - hw / 2, cy + R * 0.94, hw, h * 0.5 - (cy + R * 0.94 - cy));
    // 柄端玉坠
    const knobY = Math.min(h - h * 0.04, cy + R + h * 0.16);
    ctx.beginPath();
    ctx.arc(cx, knobY, hw * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#8fa88c', 0.9);
    ctx.fill();
    ctx.strokeStyle = rgba('#4c5a48', 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 扇面钤印（若有）
    if (p.sealPos !== 'none') {
      const s = Math.round(R * 0.16);
      const px = p.sealPos === 'tl' || p.sealPos === 'bl' ? cx - R * 0.7 : cx + R * 0.7 - s;
      const py = p.sealPos === 'tl' || p.sealPos === 'tr' ? cy - R * 0.7 : cy + R * 0.7 - s;
      ctx.save();
      ctx.fillStyle = rgba('#b23a2e', 0.12);
      ctx.fillRect(px, py, s, s);
      ctx.strokeStyle = rgba('#b23a2e', 0.5);
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.strokeRect(px, py, s, s);
      ctx.strokeRect(px + s * 0.14, py + s * 0.14, s * 0.72, s * 0.72);
      ctx.restore();
    }
    softShadow(ctx, w, h, 0.02);
  },
};

export { mountBorder, hash2 };
