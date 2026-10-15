// V2-C7 C6：载体材质确定性噪声与色温工具
//
// 全部为纯函数 / 可复现随机：同一 seed 在预览与导出帧下产生完全一致的纹理，
// 避免导出视频逐帧纹理抖动（这是程序化材质的关键约束）。
//
// 零依赖：不引入任何噪声库。

/** 确定性 PRNG（mulberry32）。返回 [0,1) 序列，同一 seed 全平台一致。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 确定性哈希 → [0,1)。用于按坐标取稳定随机值（不依赖调用顺序）。 */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 双线性插值的 value noise（平滑随机场），t∈[0,1] 为可调频率。 */
export function valueNoise2(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** 分形布朗运动（多层 value noise 叠加），用于天然材质的不规则感。 */
export function fbm2(x: number, y: number, seed = 0, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, y * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return norm > 0 ? sum / norm : 0;
}

/** 1D 确定性噪声（竹节、木节、轴杆不匀等轴向扰动）。 */
export function noise1(t: number, seed = 0): number {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  const a = hash2(i, 0, seed);
  const b = hash2(i + 1, 0, seed);
  return a * (1 - u) + b * u;
}

// ===== 色温 =====

/** 十六进制色 → [r,g,b]（0-255）。非法输入回退中性灰。 */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [128, 128, 128];
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * 按色温偏移颜色。warmth ∈ [-1,1]：
 *   · >0 暖：加红黄、减蓝（宣纸/绢帛的岁月感）
 *   · <0 冷：加蓝青、减红（青灰拓片/冷调绫）
 * 返回 rgb() 字符串，可直接用于 fillStyle。
 */
export function applyWarmth(hex: string, warmth: number): string {
  const [r, g, b] = hexToRgb(hex);
  const w = Math.max(-1, Math.min(1, warmth));
  // 暖：r += 18w, g += 10w, b -= 16w；冷则符号相反
  const nr = clamp255(r + 18 * w);
  const ng = clamp255(g + 10 * w);
  const nb = clamp255(b - 16 * w);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

/** 颜色明度调节（amount>0 提亮，<0 压暗），用于老化/阴影层。 */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount >= 0 ? 255 : 0;
  const k = Math.abs(Math.max(-1, Math.min(1, amount)));
  return `rgb(${clamp255(r + (t - r) * k)}, ${clamp255(g + (t - g) * k)}, ${clamp255(b + (t - b) * k)})`;
}

/** rgba 包装（避免各插件重复拼字符串）。 */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
