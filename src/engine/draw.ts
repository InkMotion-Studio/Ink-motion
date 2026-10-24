// V2 重建：书写引擎统一观感层（从 dev 的 C7 统一基元回收，移植到 main 的正确逐笔 median 引擎之上）。
//
// 诚实边界（勿在 UI 中夸大）：本模块提供的是「参数化近似」观感，不是毛笔物理仿真。
// 笔锋 = 线宽两端收细；墨迹浓淡 = 透明度调制；速度曲线 = 每笔内时间重映射。
//
// 设计原则：纯函数优先（曲线无副作用，便于单测与导出帧一致性）；零外部依赖。

import type { OutlineGlyph } from './outline';

/** 统一墨迹观感参数。各渲染路径共用，数值可按路径微调。 */
export interface InkStyle {
  /** 墨色 */
  color: string;
  /**
   * 基准线宽比例（相对 em 字面高）。1.0 表示约 4.5% em。
   * 实际线宽 = widthRatio * em * strokeWidthAt(u)。
   */
  widthRatio: number;
  /**
   * 笔锋强度 ∈ [0,1]：起笔与收笔的线宽收细程度。
   * 0 = 无笔锋（等宽）；1 = 起收笔收细至 25% 宽度。
   */
  taper: number;
  /**
   * 墨迹浓淡振幅 ∈ [0,1]：笔画两端透明度降低的幅度。
   * 0 = 恒定不透明；1 = 两端降至 45% 不透明度（有入纸/提笔感）。
   */
  inkFlow: number;
  /**
   * 速度曲线：单笔内部的时间重映射。
   * · linear = 匀速（旧行为）
   * · scribe = 书写感（起笔略迟滞 → 行笔加速 → 收笔略顿）
   */
  speedCurve: 'linear' | 'scribe';
  /** 圆头/圆角描边（书法观感为 true；机械描边可设 false） */
  round: boolean;
}

/** 默认观感：书写感速度曲线 + 中等笔锋与浓淡。 */
export const DEFAULT_INK_STYLE: InkStyle = {
  color: '#1a1a1a',
  widthRatio: 1,
  taper: 0.55,
  inkFlow: 0.45,
  speedCurve: 'scribe',
  round: true,
};

/** 楷体逐笔默认观感（面向真笔顺 median 引擎）。 */
export const DEFAULT_KAI_INK_STYLE: InkStyle = {
  color: '#1a1a1a',
  widthRatio: 1,
  taper: 0.55,
  inkFlow: 0.45,
  speedCurve: 'scribe',
  round: true,
};

/** 以缺省观感为基础合并覆盖项，返回新对象（不改动入参）。 */
export function inkStyle(overrides: Partial<InkStyle> = {}): InkStyle {
  return { ...DEFAULT_INK_STYLE, ...overrides };
}

// ===== 速度曲线（每笔内时间重映射） =====

/**
 * 书写感时间重映射：输入线性进度 u∈[0,1]，输出该进度对应的「位移比例」。
 * 特征：起笔略迟滞（前 15% 位移慢）、中段加速、收笔略顿（末 15% 位移收慢）。
 * 端点严格满足 f(0)=0、f(1)=1，保证笔画不会提前完成或永不完成。
 */
export function easeSinceWrite(u: number): number {
  const t = clamp01(u);
  if (t === 0) return 0;
  if (t === 1) return 1;
  const smooth = t * t * (3 - 2 * t);
  const bias = clamp01(t * 1.08 ** ((t - 0.5) * -2));
  return clamp01(smooth * 0.65 + bias * 0.35);
}

/** 线性速度曲线（整字显现等非逐笔场景）。 */
export function linearProgress(u: number): number {
  return clamp01(u);
}

/** 按 speedCurve 取时间重映射后的进度。 */
export function progressByStyle(u: number, curve: InkStyle['speedCurve']): number {
  return curve === 'scribe' ? easeSinceWrite(u) : linearProgress(u);
}

// ===== 笔锋（线宽随笔内进度变化） =====

/**
 * 笔内进度 u 处的线宽系数。
 * u=0（起笔）与 u=1（收笔）收细，中段最饱满。taper=0 时恒为 1。
 */
export function strokeWidthAt(u: number, style: InkStyle): number {
  const taper = clamp01(style.taper);
  if (taper === 0) return 1;
  const t = clamp01(u);
  const shape = Math.sin(Math.PI * t); // 0→1→0
  const minRatio = 1 - 0.75 * taper; // taper=1 → 0.25
  return minRatio + (1 - minRatio) * shape;
}

/**
 * 笔内进度 u 处的墨迹不透明度系数。
 * inkFlow=0 时恒为 1；>0 时两端略淡（入纸/提笔感）。
 */
export function alphaAt(u: number, style: InkStyle): number {
  const flow = clamp01(style.inkFlow);
  if (flow === 0) return 1;
  const t = clamp01(u);
  const shape = Math.sin(Math.PI * t);
  const minAlpha = 1 - 0.55 * flow; // flow=1 → 0.45
  return minAlpha + (1 - minAlpha) * shape;
}

/**
 * 沿折线（中线点序列）绘制带笔锋的笔画：逐小段描边，线宽与墨色随「沿笔画进度 u」调制，
 * 实现起收笔收细、两端略淡的书法观感。frac∈(0,1] 为本笔已书写比例（已含速度曲线映射）。
 *
 * 调用方需已把坐标系变换到 1024 设计空间（y 向上）；本函数只负责描边。
 * 每小段独立 beginPath/stroke，便于按段施加线宽与透明度；round 描边保证笔意连续。
 */
export function drawTaperedPolyline(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  frac: number,
  baseWidth: number,
  style: InkStyle,
): void {
  if (pts.length === 0 || frac <= 0) return;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  if (total === 0) return;
  const target = total * Math.min(1, frac);
  let acc = 0;
  ctx.lineCap = style.round ? 'round' : 'butt';
  ctx.lineJoin = style.round ? 'round' : 'miter';
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0];
    const ay = pts[i - 1][1];
    const bx = pts[i][0];
    const by = pts[i][1];
    const segLen = Math.hypot(bx - ax, by - ay);
    if (segLen === 0) continue;
    if (acc >= target) break;
    const segTarget = Math.min(segLen, target - acc);
    const r = segTarget / segLen;
    const ex = ax + (bx - ax) * r;
    const ey = ay + (by - ay) * r;
    const u = (acc + segTarget / 2) / total; // 本段中点的沿笔画进度
    ctx.lineWidth = baseWidth * strokeWidthAt(u, style);
    ctx.globalAlpha = alphaAt(u, style);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    acc += segTarget;
    if (r < 1) break;
  }
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ===== 兼容导出（供其它轮廓路径复用，避免重复实现） =====

/** 从 OutlineGlyph 取变换包围盒（镜像 dev 的统一基元，保持接口一致）。 */
export function outlineBox(o: OutlineGlyph): {
  unitsPerEm: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
} {
  return {
    unitsPerEm: o.unitsPerEm || 1024,
    xMin: o.xMin,
    yMin: o.yMin,
    xMax: o.xMax,
    yMax: o.yMax,
  };
}
