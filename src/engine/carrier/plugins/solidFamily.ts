// V2-C7 C6：实体材质类载体插件（竹简 / 木牍 / 碑拓）
//
// 特征：有明确「结构件」（竹片/木板/石面），强调厚度、弧度、磨损与错落，
// 彻底摆脱 V1 版「等宽矩形平铺」的廉价感。

import { applyWarmth, fbm2, hash2, mulberry32, noise1, rgba, shade } from '../noise';
import { blob, edgeStain, grain, softShadow, vignette } from '../material';
import { resolveParams } from '../types';
import type { CarrierPlugin } from '../types';

// ===== 2. 竹简 =====
export const bamboo: CarrierPlugin = {
  type: 'bamboo',
  label: '竹简',
  usesBackground: true,
  render(ctx, w, h, raw) {
    // 底衬（简后阴影/席面）
    const back = raw.backgroundColor || '#c9ab74';
    const p = resolveParams({ ...raw, backgroundColor: back }, { seed: 20261014 });
    ctx.fillStyle = applyWarmth(shade(back, -0.55), p.warmth);
    ctx.fillRect(0, 0, w, h);

    const seed = p.seed;
    const slats = Math.max(7, Math.round(w / Math.max(28, w * 0.062)));
    const slatW = w / slats;
    const gap = Math.max(1.5, slatW * 0.075);

    for (let i = 0; i < slats; i++) {
      const x = i * slatW;
      const bw = slatW - gap;
      // 每片独立色相 + 高低错落（真实竹简长短不一）
      const tone = (hash2(i, 0, seed) - 0.5) * 0.16;
      const topJit = (hash2(i, 1, seed) - 0.5) * h * 0.022;
      const botJit = (hash2(i, 2, seed) - 0.5) * h * 0.022;
      const y0 = Math.max(0, topJit);
      const y1 = h - Math.max(0, botJit);

      // 竹片主体：横向弧度（中间亮、两侧暗）
      const g = ctx.createLinearGradient(x, 0, x + bw, 0);
      g.addColorStop(0, applyWarmth(shade('#a8884f', -0.12 + tone), p.warmth ?? 0));
      g.addColorStop(0.34, applyWarmth(shade('#cdb079', 0.1 + tone), p.warmth ?? 0));
      g.addColorStop(0.62, applyWarmth(shade('#c2a468', 0.04 + tone), p.warmth ?? 0));
      g.addColorStop(1, applyWarmth(shade('#96773f', -0.16 + tone), p.warmth ?? 0));
      ctx.fillStyle = g;
      ctx.fillRect(x, y0, bw, y1 - y0);

      // 竹纹（纵向细丝，随片变化）
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y0, bw, y1 - y0);
      ctx.clip();
      ctx.globalAlpha = 0.14;
      ctx.lineWidth = 1;
      const fibers = 3 + Math.floor(hash2(i, 3, seed) * 3);
      for (let k = 0; k < fibers; k++) {
        const fx = x + (bw * (k + 0.5)) / fibers + (noise1(i * 5 + k, seed) - 0.5) * bw * 0.2;
        ctx.strokeStyle = k % 2 === 0 ? '#6b542e' : '#e0cb94';
        ctx.beginPath();
        ctx.moveTo(fx, y0);
        ctx.lineTo(fx + (noise1(i * 7 + k, seed + 3) - 0.5) * 3, y1);
        ctx.stroke();
      }
      ctx.restore();

      // 竹节（横向隆起）：每片 1~3 处
      const knots = 1 + Math.floor(hash2(i, 4, seed) * 3);
      for (let k = 0; k < knots; k++) {
        const ky = y0 + ((y1 - y0) * (k + 0.5 + (hash2(i, 5 + k, seed) - 0.5) * 0.4)) / knots;
        const kg = ctx.createLinearGradient(x, ky - 5, x, ky + 5);
        kg.addColorStop(0, 'rgba(120,96,48,0)');
        kg.addColorStop(0.45, 'rgba(96,74,34,0.32)');
        kg.addColorStop(0.55, 'rgba(224,205,150,0.28)');
        kg.addColorStop(1, 'rgba(120,96,48,0)');
        ctx.fillStyle = kg;
        ctx.fillRect(x, ky - 5, bw, 10);
      }

      // 片间隙阴影（右侧）+ 高光（左侧）
      ctx.fillStyle = 'rgba(46,32,14,0.42)';
      ctx.fillRect(x + bw, 0, gap, h);
      ctx.fillStyle = 'rgba(255,246,214,0.18)';
      ctx.fillRect(x + bw - 1, 0, 1, h);

      // 片端磨损（上下缘）
      ctx.fillStyle = 'rgba(70,52,22,0.2)';
      ctx.fillRect(x, y0, bw, 2);
      ctx.fillRect(x, y1 - 2, bw, 2);
    }

    // 编绳：三道麻绳（穿过竹片，有编织感）
    const cords = [Math.round(h * 0.16), Math.round(h * 0.5), Math.round(h * 0.84)];
    for (const cy of cords) {
      // 绳体
      const cg = ctx.createLinearGradient(0, cy - 5, 0, cy + 5);
      cg.addColorStop(0, 'rgba(52,34,16,0.85)');
      cg.addColorStop(0.5, 'rgba(122,92,50,0.9)');
      cg.addColorStop(1, 'rgba(52,34,16,0.85)');
      ctx.fillStyle = cg;
      ctx.fillRect(0, cy - 5, w, 10);
      // 绳纹（斜向缠绕）
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#2e2110';
      ctx.lineWidth = 1;
      for (let x = -6; x < w; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, cy - 5);
        ctx.lineTo(x + 4, cy + 5);
        ctx.stroke();
      }
      ctx.restore();
    }

    grain(ctx, w, h, p, 0.3);
    vignette(ctx, w, h, p, 0.2);
    softShadow(ctx, w, h, 0.02);
  },
};

// ===== 6. 木牍 =====
export const wood: CarrierPlugin = {
  type: 'wood',
  label: '木牍',
  usesBackground: true,
  render(ctx, w, h, raw) {
    const warm = raw.warmth ?? 0.2;
    const seed = raw.seed ?? 20261024;
    const base = '#c19a63';
    const aging = raw.aging ?? 0.4;
    ctx.fillStyle = applyWarmth(shade(base, -0.2), warm);
    ctx.fillRect(0, 0, w, h);

    // 木纹年轮：多条沿长边的弯曲纹（fbm 扰动）
    const rnd = mulberry32(seed);
    const lines = Math.round(w / 14) + 12;
    ctx.save();
    for (let i = 0; i < lines; i++) {
      const baseY = (i / lines) * h + (rnd() - 0.5) * 8;
      const amp = 3 + rnd() * 14;
      const dark = rnd() > 0.55;
      ctx.strokeStyle = dark ? rgba(shade(base, -0.5), 0.16 + rnd() * 0.14) : rgba(shade(base, 0.4), 0.13);
      ctx.lineWidth = 0.8 + rnd() * 1.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = baseY + Math.sin((x / w) * Math.PI * 2 * (1 + rnd())) * amp + (fbm2(x / 90, i * 3, seed, 2) - 0.5) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 木节：2~4 个同心椭圆
    const knots = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < knots; k++) {
      const cx = w * (0.15 + rnd() * 0.7);
      const cy = h * (0.1 + rnd() * 0.8);
      const r = Math.min(w, h) * (0.02 + rnd() * 0.03);
      ctx.save();
      for (let ring = 5; ring >= 1; ring--) {
        ctx.strokeStyle = rgba(shade(base, -0.55), 0.06 * ring);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * ring * 0.22, r * ring * 0.32, rnd() * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(shade(base, -0.6), 0.28);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.2, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 板面弧度与厚度：左右边缘内收阴影
    const eg = ctx.createLinearGradient(0, 0, w, 0);
    eg.addColorStop(0, 'rgba(60,38,12,0.3)');
    eg.addColorStop(0.06, 'rgba(60,38,12,0)');
    eg.addColorStop(0.94, 'rgba(60,38,12,0)');
    eg.addColorStop(1, 'rgba(60,38,12,0.34)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, w, h);
    const tg = ctx.createLinearGradient(0, 0, 0, h);
    tg.addColorStop(0, 'rgba(60,38,12,0.26)');
    tg.addColorStop(0.05, 'rgba(60,38,12,0)');
    tg.addColorStop(0.95, 'rgba(60,38,12,0)');
    tg.addColorStop(1, 'rgba(60,38,12,0.3)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, w, h);

    // 边缘磨损与裂纹
    ctx.save();
    ctx.strokeStyle = rgba('#4a3010', 0.3);
    ctx.lineWidth = 1;
    const cracks = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < cracks; i++) {
      let x = rnd() * w;
      let y = rnd() < 0.5 ? 0 : h;
      const dir = y === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (rnd() - 0.5) * 30;
        y += dir * (10 + rnd() * 24);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    grain(ctx, w, h, { backgroundColor: base, warmth: warm, aging, sealPos: raw.sealPos ?? 'none', seed }, 0.4);
    edgeStain(ctx, w, h, { backgroundColor: base, warmth: warm, aging, sealPos: raw.sealPos ?? 'none', seed }, 0.055);
    vignette(ctx, w, h, { backgroundColor: base, warmth: warm, aging, sealPos: raw.sealPos ?? 'none', seed }, 0.2);
    softShadow(ctx, w, h, 0.028);
  },
};

// ===== 7. 碑拓 =====
export const rubbing: CarrierPlugin = {
  type: 'rubbing',
  label: '碑拓',
  usesBackground: true,
  render(ctx, w, h, raw) {
    // 碑拓基调：深墨底 + 拓纸的灰黑渐变（非纯黑，有层次）
    const seed = raw.seed ?? 20261025;
    const aging = raw.aging ?? 0.55;
    const ink = shade(raw.backgroundColor || '#2a2724', -0.62);
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, w, h);

    // 石面颗粒：强 fbm（花岗岩/青石质感）
    ctx.save();
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const n = fbm2(x / 26, y / 26, seed, 4);
        const v = (n - 0.5) * 0.34;
        if (Math.abs(v) < 0.01) continue;
        ctx.fillStyle = v > 0 ? `rgba(210,206,196,${v})` : `rgba(0,0,0,${-v})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
    ctx.restore();

    // 拓纸褶皱：斜向明暗带
    ctx.save();
    ctx.globalAlpha = 0.1;
    const foldCount = 5 + Math.round(aging * 8);
    const rnd = mulberry32(seed ^ 0xf01d);
    for (let i = 0; i < foldCount; i++) {
      const x0 = rnd() * w;
      const wide = 8 + rnd() * 26;
      const g = ctx.createLinearGradient(x0, 0, x0 + wide, h);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, rnd() > 0.5 ? 'rgba(228,224,214,0.5)' : 'rgba(0,0,0,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0 - 2, 0, wide + 4, h);
    }
    ctx.restore();

    // 斑驳残损（拓片剥落）
    const spots = Math.round(10 + 50 * aging);
    for (let i = 0; i < spots; i++) {
      const cx = rnd() * w;
      const cy = rnd() * h;
      const r = Math.min(w, h) * (0.01 + rnd() * 0.05);
      blob(ctx, cx, cy, r, '#0d0b09', 0.3 + rnd() * 0.4);
    }

    // 边缘漫漶（碑拓四边常不齐）
    edgeStain(ctx, w, h, { backgroundColor: '#3a3632', warmth: raw.warmth ?? -0.15, aging, sealPos: 'none', seed }, 0.09);
    vignette(ctx, w, h, { backgroundColor: '#3a3632', warmth: raw.warmth ?? -0.15, aging, sealPos: 'none', seed }, 0.3);
    softShadow(ctx, w, h, 0.03);
  },
};
