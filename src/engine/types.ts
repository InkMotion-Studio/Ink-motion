// 引擎公共类型（N2.x）。坐标单位为画布像素，原点左上，y 向下。

export type StrokePathKind = 'kai' | 'song' | 'seal' | 'li' | 'custom'; // custom=用户上传/自定义字体（V2-C4 N4.1）

export interface GlyphPlacement {
  char: string;
  col: number; // 0 = 最右列
  row: number; // 0 = 顶部
  x: number; // 字形方块左上角 x
  y: number; // 字形方块左上角 y
  size: number; // 字形方块边长
  order: number; // 书写顺序（列优先，右→左，上→下）
  path: StrokePathKind;
  strokeCount: number; // 楷体笔画数（缺失时估计）
  isPunct: boolean;
}

export interface LayoutResult {
  glyphs: GlyphPlacement[];
  cols: number;
  colWidth: number;
  rowHeight: number;
  padding: number;
  contentHeight: number; // 实际用到的最大行数 × 行高 + 上下 padding（纵向内容高）
  contentWidth: number; // 实际列数 × 列宽 + 左右 padding（横向内容宽，竖排长文会超出画布宽）
  perCol: number;
}

// C5：已删除历史遗留的 HanziStrokeData 结构（含 hanzi-writer 的 strokes/medians）。
// 自 C2 起数据源为本地权威笔顺，C3 起逐笔轨迹由「字体轮廓 + 笔顺顺序」生成，
// 该结构全仓零引用，于 C5 清理（同时移除 package.json 中的 hanzi-writer 依赖）。

/**
 * C2：权威笔顺结果（数据源：scripts/build-strokeorder.mjs 从 cnchar 导出，
 * 依据《现代汉语通用字笔顺规范》GF 3002-1999 及《通用规范汉字表》）。
 * order = 26 字母笔画类型编码序列（如 "gesl"）；source = 数据来源层。
 */
export interface StrokeOrderResult {
  /** 26 字母笔顺序列（如 "gesl"），逐笔动画按此顺序推进 */
  order: string;
  /** 笔画数（= order.length） */
  strokeCount: number;
  /** 数据来源：authority=A+B 层权威内置；user=C 层用户定制（C4 接入） */
  source: 'authority' | 'user';
}
