// V2-C7 C5：书写引擎统一基元（观感层）
//
// 目的：把 kai / song / brush / seal / li 五条渲染路径从「各自临时实现」统一到同一套
// 「设计坐标 → 画布方块」变换 + 同一套墨迹观感参数（笔锋 / 速度曲线 / 墨迹浓淡）。
//
// 设计原则：
//   · 纯函数优先（变换与参数曲线无副作用，便于单测与导出帧一致性）；
//   · 零外部依赖（不引入任何字体/CDN/绘图库）；
//   · 向后兼容（既有 drawXxx 签名保持不变，内部改调本模块）。
//
// 诚实边界（勿在 UI 中夸大）：本模块提供的是「参数化近似」观感，不是毛笔物理仿真。
// 笔锋 = 线宽两端收细；墨迹浓淡 = 透明度调制；速度曲线 = 每笔内时间重映射。

import type { GlyphPlacement } from './types';
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

/** 默认观感：书写感速度曲线 + 中等笔锋与浓淡（面向楷体逐笔）。 */
export const DEFAULT_INK_STYLE: InkStyle = {
  color: '#1a1a1a',
  widthRatio: 1,
  taper: 0.55,
  inkFlow: 0.45,
  speedCurve: 'scribe',
  round: true,
};

/**
 * 整字显现路径（无逐笔数据）的观感：无笔锋（整字填充），但仍保留浓淡渐显。
 * taper=0（不做线宽处理）、speedCurve=linear（整字一次性淡入）。
 */
export const WHOLE_GLYPH_INK_STYLE: InkStyle = {
  color: '#1a1a1a',
  widthRatio: 1,
  taper: 0,
  inkFlow: 0.6,
  speedCurve: 'linear',
  round: true,
};

/** 受限字库轮廓描边（seal/li 的 outlineAnimation）观感：笔锋弱、浓淡中等。 */
export const OUTLINE_INK_STYLE: InkStyle = {
  color: '#1a1a1a',
  widthRatio: 1,
  taper: 0.25,
  inkFlow: 0.35,
  speedCurve: 'linear',
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
  // 平滑阶跃的「反 S 略偏前快」：使用三次贝塞尔近似 y = 3t²-2t³ 的偏置版本。
  // 引入轻微前倾（行笔在 30%~70% 区间推进更快），收尾用二次缓和。
  const smooth = t * t * (3 - 2 * t);
  // 前进偏置：把中段推进提前（乘 1.08 后夹紧，再与 smooth 加权 0.35）
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
  // 两端收细：以 0.25 为收细下限，按 taper 向 1 插值。
  // 使用 sin(pi*t) 形状使中段饱满、两端平滑收细。
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

// ===== 统一坐标变换 =====

/** 字形方块与设计框的映射结果（供需要在设计坐标内做额外绘制的调用方复用）。 */
export interface GlyphTransform {
  /** em 缩放（设计坐标 → 画布像素，未含 /unitsPerEm） */
  scale: number;
  /** 每设计单位对应的画布像素数（已含 /unitsPerEm）。描边线宽应以本值为基准换算。 */
  pxPerUnit: number;
  /** 设计坐标原点在画布中的位置（已含居中） */
  originX: number;
  originY: number;
}

/**
 * 计算「设计坐标 → 画布方块」的变换参数（纯计算，不改动 ctx）。
 * 约定：TTF 设计坐标 y 向上，画布 y 向下；以字体设计框居中适配方块并留边距。
 *
 * @param box 设计框（可传 OutlineGlyph 或其 bbox）
 * @param size 目标方块边长（画布像素）
 * @param marginRatio 边距比例（默认 0.04）
 */
export function computeGlyphTransform(
  box: { unitsPerEm: number; xMin: number; yMin: number; xMax: number; yMax: number },
  size: number,
  marginRatio = 0.04,
): GlyphTransform {
  const gw = Math.max(1, box.xMax - box.xMin);
  const gh = Math.max(1, box.yMax - box.yMin);
  const scale = (size * (1 - marginRatio * 2)) / Math.max(gw, gh);
  return { scale, pxPerUnit: scale, originX: box.xMin + gw / 2, originY: box.yMin + gh / 2 };
}

/**
 * 在 ctx 上施加「设计坐标 → 画布方块」变换（含居中与 y 轴翻转）。
 * 调用方需自行 save/restore。返回变换参数，便于后续换算线宽等。
 *
 * 这是全工程**唯一**的设计坐标变换实现——drawKaiGlyph / drawGlyphOutline 等一律复用，
 * 消除此前三处重复且包围盒来源不一致的问题（C5 统一）。
 */
export function applyGlyphTransform(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphPlacement,
  box: { unitsPerEm: number; xMin: number; yMin: number; xMax: number; yMax: number },
  marginRatio = 0.04,
): GlyphTransform {
  const tf = computeGlyphTransform(box, glyph.size, marginRatio);
  // computeGlyphTransform 的 scale 已是被设计框宽归一化的「每设计单位→画布像素」系数，
  // 无需再除 unitsPerEm（否则会额外缩小 unitsPerEm 倍，导致字形被压到亚像素、线宽相对爆炸 → 整字黑块）。
  const pxPerUnit = tf.scale;
  ctx.translate(glyph.x + glyph.size / 2, glyph.y + glyph.size / 2);
  ctx.scale(pxPerUnit, -pxPerUnit);
  ctx.translate(-tf.originX, -tf.originY);
  return { ...tf, pxPerUnit };
}

/** 从 OutlineGlyph 直接取变换包围盒。 */
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

/**
 * 设计坐标下的线宽（设计单位）。
 * ctx 已通过 applyGlyphTransform 进入设计坐标空间（1 设计单位 ≈ pxPerUnit 像素），
 * 故此处直接返回相对字高（em）的线宽比例即可，由 ctx 的缩放自动映射为正确像素。
 * 相对字高 4.5%（widthRatio=1）是书法笔画的典型字面占比。
 */
export function designLineWidth(style: InkStyle, em: number, _scale: number, u = 0.5): number {
  return em * 0.045 * style.widthRatio * strokeWidthAt(u, style);
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
