// N2.4 载体引擎抽象层 + N2.5 宣纸卷轴 / 竹简
// CarrierPlugin 契约：给定 2D 上下文与画布尺寸，仅负责背景绘制（前景字形由场景层叠加）。
// 纹理贴图（N0.4/CDN 资产）可用时优先平铺真实纹理，否则回退程序化渲染。
import type { CarrierType } from '@/db/types';
import { getTexture } from '@/lib/textures';

export interface CarrierRenderOpts {
  backgroundColor: string;
}

export interface CarrierPlugin {
  type: CarrierType;
  label: string;
  render(ctx: CanvasRenderingContext2D, width: number, height: number, opts: CarrierRenderOpts): void;
}

// 确定性伪随机（同一 seed 复现纹理，便于导出一致）
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const paper: CarrierPlugin = {
  type: 'paper',
  label: '宣纸卷轴',
  render(ctx, width, height, opts) {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 优先平铺真实宣纸纹理（N0.4 CDN 资产）
    const tex = getTexture('paper');
    if (tex) {
      const pat = ctx.createPattern(tex, 'repeat');
      if (pat) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    } else {
      // 回退：程序化纸纤维
      const rnd = mulberry32(20261013);
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = '#8a8175';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 3) {
        if (rnd() > 0.6) {
          ctx.beginPath();
          ctx.moveTo(i + rnd() * 2, 0);
          ctx.lineTo(i + rnd() * 2, height);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 内框
    ctx.strokeStyle = 'rgba(120,100,70,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, width - 28, height - 28);

    // 上下卷轴轴杆
    const barH = Math.max(18, Math.round(height * 0.018));
    const grad = ctx.createLinearGradient(0, 0, 0, barH);
    grad.addColorStop(0, '#7a5a32');
    grad.addColorStop(0.5, '#a8884f');
    grad.addColorStop(1, '#7a5a32');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, barH);
    ctx.fillRect(0, height - barH, width, barH);
  },
};

const bamboo: CarrierPlugin = {
  type: 'bamboo',
  label: '竹简',
  render(ctx, width, height, opts) {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const rnd = mulberry32(20261014);
    const tex = getTexture('bamboo');
    const slatW = Math.round(width / 14); // 约 14 枚竹片
    const gap = Math.max(2, Math.round(slatW * 0.06));
    let x = 0;
    while (x < width) {
      const w = slatW - gap;
      if (tex) {
        // 每片竹简裁切一段纹理，避免平铺重复感
        const pat = ctx.createPattern(tex, 'repeat');
        if (pat) {
          ctx.save();
          ctx.fillStyle = pat;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(x, 0, w, height);
          ctx.restore();
        }
      } else {
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, '#b89a63');
        g.addColorStop(0.5, '#cdb079');
        g.addColorStop(1, '#a8884f');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, w, height);
      }
      // 竹片竖纹与立体边
      ctx.save();
      ctx.globalAlpha = tex ? 0.18 : 0.12;
      ctx.strokeStyle = '#6b542e';
      ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) {
        const lx = x + (w * k) / 4 + (rnd() - 0.5) * 4;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, height);
        ctx.stroke();
      }
      ctx.restore();
      // 竹片间隙阴影
      ctx.fillStyle = 'rgba(60,42,22,0.25)';
      ctx.fillRect(x + w, 0, gap, height);
      x += slatW;
    }

    // 编绳：两道横向麻绳
    ctx.fillStyle = 'rgba(60,42,22,0.55)';
    const cords = [Math.round(height * 0.18), Math.round(height * 0.82)];
    for (const cy of cords) ctx.fillRect(0, cy - 4, width, 8);
  },
};

export const CARRIER_PLUGINS: Record<CarrierType, CarrierPlugin> = { paper, bamboo };

export function renderCarrier(
  ctx: CanvasRenderingContext2D,
  type: CarrierType,
  width: number,
  height: number,
  opts: CarrierRenderOpts,
) {
  CARRIER_PLUGINS[type].render(ctx, width, height, opts);
}
