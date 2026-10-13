// N2.1 排版引擎：竖排右起、标点适配、自动分列。
// 列优先书写顺序：从最右列向下，再向左换列；换行符强制换列。
import type { GlyphPlacement, LayoutResult, StrokePathKind } from './types';

const PUNCTUATION = new Set([
  '，', '。', '！', '？', '、', '；', '：', '“', '”', '‘', '’', '（', '）',
  '《', '》', '…', '—', '·', '．', '﹐', '﹑', '！', '？',
]);

function isPunct(ch: string): boolean {
  return PUNCTUATION.has(ch);
}

export interface LayoutInput {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  path: StrokePathKind;
}

export function layoutText(input: LayoutInput): LayoutResult {
  const { text, width, height, fontSize, path } = input;
  const padding = Math.round(fontSize * 0.6);
  const colGap = Math.round(fontSize * 0.35);
  const colWidth = fontSize + colGap;
  const rowHeight = Math.round(fontSize * 1.18);

  const usableH = height - padding * 2;
  const perCol = Math.max(1, Math.floor(usableH / rowHeight));

  const chars = Array.from(text);
  const glyphs: GlyphPlacement[] = [];

  let col = 0;
  let row = 0;
  let order = 0;

  const pushChar = (ch: string) => {
    const x = width - padding - (col + 1) * colWidth + colGap / 2;
    const yOffset = (rowHeight - fontSize) / 2;
    const y = padding + row * rowHeight + yOffset;
    const punct = isPunct(ch);
    glyphs.push({
      char: ch,
      col,
      row,
      x,
      y,
      size: fontSize,
      order: order++,
      path,
      strokeCount: estimateStrokeCount(ch, punct),
      isPunct: punct,
    });
  };

  for (const ch of chars) {
    if (ch === '\n' || ch === '\r') {
      // 换行：换到左侧新列顶部
      col += 1;
      row = 0;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      // 空格：占位但不绘制（推进书写顺序）
      pushChar(' ');
      row += 1;
      if (row >= perCol) {
        col += 1;
        row = 0;
      }
      continue;
    }
    pushChar(ch);
    row += 1;
    if (row >= perCol) {
      col += 1;
      row = 0;
    }
  }

  // 竖排：列横向铺开，内容总宽 = 实际列数 × 列宽（含右 padding）；
  // contentHeight 取实际用到的最大行数（单列内），用于纵向判定。
  const usedCols = col + 1;
  const maxRow = Math.max(
    1,
    ...glyphs.map((g) => g.row + 1),
  );
  const contentWidth = padding * 2 + usedCols * colWidth;
  const contentHeight = padding * 2 + maxRow * rowHeight;
  return {
    glyphs,
    cols: usedCols,
    colWidth,
    rowHeight,
    padding,
    contentHeight,
    contentWidth,
    perCol,
  };
}

// 缺失笔画数据时按字形复杂度估计（用于计时与降级）。古文字路径在调用层已拦截。
function estimateStrokeCount(ch: string, punct: boolean): number {
  if (punct) return 1;
  if (/\s/.test(ch)) return 0;
  // 粗略：常用字 5–12 画；此处取 8 作为中位数估计
  return 8;
}
