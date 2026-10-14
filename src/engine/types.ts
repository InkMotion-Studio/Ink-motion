// 引擎公共类型（N2.x）。坐标单位为画布像素，原点左上，y 向下。

export type StrokePathKind = 'kai' | 'song' | 'seal'; // 三路径（seal=小篆受限字库）

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

export interface HanziStrokeData {
  strokes: string[]; // 笔画轮廓 SVG path（1024 坐标空间）
  medians: number[][][]; // 每笔画中线点序列
}
