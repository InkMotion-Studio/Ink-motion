// V2-C7 C5：书写引擎统一与观感 —— 基元与整合单测
//
// 覆盖：
//   1. draw.ts 观感曲线（速度曲线、笔锋线宽、墨迹浓淡）的端点与单调性；
//   2. 统一坐标变换 computeGlyphTransform / applyGlyphTransform 与 drawKaiGlyph 共用口径；
//   3. 整字显现合并后 drawSongGlyph / drawRestrictedGlyph 的行为一致性与字号差异；
//   4. 计时线统一（song 与 kai 同文本口径可比）；
//   5. 竖排布局为逐笔提供的方块正确（不重叠、笔画落于方块内）。
import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_INK_STYLE,
  WHOLE_GLYPH_INK_STYLE,
  easeSinceWrite,
  linearProgress,
  progressByStyle,
  strokeWidthAt,
  alphaAt,
  inkStyle,
  computeGlyphTransform,
  applyGlyphTransform,
  outlineBox,
} from '../draw';
import {
  buildStrokePaths,
  drawKaiGlyph,
  drawSongGlyph,
  drawRestrictedGlyph,
} from '../stroke';
import { layoutText } from '../layout';
import type { OutlineGlyph } from '../outline';
import type { GlyphPlacement } from '../types';

// ===== 1. 观感曲线 =====

describe('C5 draw.ts 观感曲线', () => {
  it('easeSinceWrite 端点严格 0/1，且单调不减', () => {
    expect(easeSinceWrite(0)).toBe(0);
    expect(easeSinceWrite(1)).toBe(1);
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const v = easeSinceWrite(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it('linearProgress 恒等且 clamp', () => {
    expect(linearProgress(0)).toBe(0);
    expect(linearProgress(0.5)).toBe(0.5);
    expect(linearProgress(1)).toBe(1);
    expect(linearProgress(-1)).toBe(0);
    expect(linearProgress(2)).toBe(1);
  });

  it('progressByStyle 按曲线分派', () => {
    expect(progressByStyle(0.5, 'linear')).toBe(0.5);
    expect(progressByStyle(0.5, 'scribe')).toBe(easeSinceWrite(0.5));
  });

  it('strokeWidthAt：taper=0 恒为 1；taper>0 时两端收细、中段饱满', () => {
    expect(strokeWidthAt(0, { ...DEFAULT_INK_STYLE, taper: 0 })).toBe(1);
    expect(strokeWidthAt(0.5, { ...DEFAULT_INK_STYLE, taper: 0 })).toBe(1);
    const st = { ...DEFAULT_INK_STYLE, taper: 1 };
    expect(strokeWidthAt(0, st)).toBeLessThan(strokeWidthAt(0.5, st));
    expect(strokeWidthAt(1, st)).toBeLessThan(strokeWidthAt(0.5, st));
    // taper=1 → 端点收细至 minRatio = 1-0.75 = 0.25；中段 sin(pi/2)=1 → 1.0
    expect(strokeWidthAt(0, st)).toBeCloseTo(0.25, 6);
    expect(strokeWidthAt(0.5, st)).toBeCloseTo(1, 6);
    expect(strokeWidthAt(1, st)).toBeCloseTo(0.25, 6);
  });

  it('strokeWidthAt 输出恒在 [0.25, 1]', () => {
    for (const taper of [0, 0.3, 0.7, 1]) {
      const st = { ...DEFAULT_INK_STYLE, taper };
      for (let i = 0; i <= 20; i++) {
        const v = strokeWidthAt(i / 20, st);
        expect(v).toBeGreaterThanOrEqual(0.25 - 1e-9);
        expect(v).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('alphaAt：inkFlow=0 恒为 1；>0 时两端略淡', () => {
    expect(alphaAt(0, { ...DEFAULT_INK_STYLE, inkFlow: 0 })).toBe(1);
    const st = { ...DEFAULT_INK_STYLE, inkFlow: 1 };
    expect(alphaAt(0, st)).toBeLessThan(alphaAt(0.5, st));
    expect(alphaAt(0.5, st)).toBeCloseTo(1, 6);
  });

  it('inkStyle 合并缺省值且不修改入参', () => {
    const ov = { taper: 0.1 };
    const st = inkStyle(ov);
    expect(st.taper).toBe(0.1);
    expect(st.widthRatio).toBe(DEFAULT_INK_STYLE.widthRatio);
    expect(Object.keys(ov)).toEqual(['taper']);
  });

  it('WHOLE_GLYPH_INK_STYLE：无笔锋（taper=0）且线性速度曲线', () => {
    expect(WHOLE_GLYPH_INK_STYLE.taper).toBe(0);
    expect(WHOLE_GLYPH_INK_STYLE.speedCurve).toBe('linear');
  });
});

// ===== 2. 统一坐标变换 =====

describe('C5 统一坐标变换', () => {
  const box = { unitsPerEm: 1000, xMin: 50, yMin: -200, xMax: 950, yMax: 800 };

  it('computeGlyphTransform 以设计框中点居中、按长边缩放并留边距', () => {
    const tf = computeGlyphTransform(box, 100, 0.04);
    // 长边 = max(900, 1000) = 1000 → scale = 100*0.92/1000 = 0.092
    expect(tf.scale).toBeCloseTo(0.092, 6);
    expect(tf.originX).toBeCloseTo(500, 6);
    expect(tf.originY).toBeCloseTo(300, 6);
  });

  it('applyGlyphTransform 施加 translate/scale/translate 三步且返回同值', () => {
    const calls: string[] = [];
    const ctx = {
      translate: (x: number, y: number) => calls.push(`t:${x},${y}`),
      scale: (x: number, y: number) => calls.push(`s:${x},${y}`),
    } as unknown as CanvasRenderingContext2D;
    const glyph = { x: 10, y: 20, size: 100 } as GlyphPlacement;
    const tf = applyGlyphTransform(ctx, glyph, box, 0.04);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toBe(`t:${10 + 50},${20 + 50}`); // 方块中心
    expect(calls[2]).toBe(`t:${-tf.originX},${-tf.originY}`);
    expect(tf.scale).toBeCloseTo(computeGlyphTransform(box, 100, 0.04).scale, 9);
  });

  it('outlineBox 从 OutlineGlyph 提取包围盒（unitsPerEm 缺省 1024）', () => {
    const o = { unitsPerEm: 0, xMin: 1, yMin: 2, xMax: 3, yMax: 4, contours: [] } as OutlineGlyph;
    expect(outlineBox(o).unitsPerEm).toBe(1024);
  });
});

// ===== 3. buildStrokePaths 携带 box（口径统一） =====

describe('C5 buildStrokePaths 携带统一包围盒', () => {
  const square: OutlineGlyph = {
    unitsPerEm: 1000,
    xMin: 0,
    yMin: 0,
    xMax: 1000,
    yMax: 1000,
    contours: [
      {
        points: [
          { x: 0, y: 0, on: true },
          { x: 1000, y: 0, on: true },
          { x: 1000, y: 1000, on: true },
          { x: 0, y: 1000, on: true },
        ],
        length: 4000,
      },
    ],
  };

  it('返回的 box 与源 outline 一致', () => {
    const paths = buildStrokePaths(square, 4);
    expect(paths.box).toEqual({ unitsPerEm: 1000, xMin: 0, yMin: 0, xMax: 1000, yMax: 1000 });
  });

  it('按笔画数切分为 N 桶，且总弧长守恒', () => {
    const paths = buildStrokePaths(square, 4);
    expect(paths.strokes).toHaveLength(4);
    const sum = paths.strokes.flat().reduce((s, x) => s + x.len, 0);
    expect(sum).toBeCloseTo(paths.total, 3);
  });
});

// ===== 4. drawKaiGlyph 接入笔锋与浓淡 =====

describe('C5 drawKaiGlyph 观感接入', () => {
  const square: OutlineGlyph = {
    unitsPerEm: 1000,
    xMin: 0,
    yMin: 0,
    xMax: 1000,
    yMax: 1000,
    contours: [
      {
        points: [
          { x: 0, y: 0, on: true },
          { x: 1000, y: 0, on: true },
          { x: 1000, y: 1000, on: true },
          { x: 0, y: 1000, on: true },
        ],
        length: 4000,
      },
    ],
  };

  function mockCtx() {
    const widths: number[] = [];
    const alphas: number[] = [];
    const ctx = {
      lineWidth: 1,
      globalAlpha: 1,
      savedWidth: 1,
      strokeStyle: '',
      lineCap: '',
      lineJoin: '',
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      stroke: vi.fn(),
      get lineWidthRef() {
        return widths;
      },
      set lineWidthVal(_v: number) {
        /* noop */
      },
    } as unknown as CanvasRenderingContext2D;
    return { ctx, widths, alphas };
  }

  it('progress=1 时逐笔全部描出（stroke 调用 > 0）', () => {
    const { ctx } = mockCtx();
    const paths = buildStrokePaths(square, 4);
    const glyph = { x: 0, y: 0, size: 100, char: '永' } as GlyphPlacement;
    drawKaiGlyph(ctx, glyph, paths, 1, '#000');
    expect((ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });

  it('progress=0 时不描出任何笔画', () => {
    const { ctx } = mockCtx();
    const paths = buildStrokePaths(square, 4);
    const glyph = { x: 0, y: 0, size: 100, char: '永' } as GlyphPlacement;
    drawKaiGlyph(ctx, glyph, paths, 0, '#000');
    expect((ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it('taper 生效：中途进度下不同段的线宽不同（有笔锋）', () => {
    const widths: number[] = [];
    const ctx = {
      lineWidth: 1,
      globalAlpha: 1,
      strokeStyle: '',
      lineCap: '',
      lineJoin: '',
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      stroke: vi.fn(),
    };
    Object.defineProperty(ctx, 'lineWidth', {
      get: () => widths[widths.length - 1] ?? 1,
      set: (v: number) => widths.push(v),
    });
    const paths = buildStrokePaths(square, 8);
    const glyph = { x: 0, y: 0, size: 100, char: '永' } as GlyphPlacement;
    drawKaiGlyph(ctx as unknown as CanvasRenderingContext2D, glyph, paths, 0.5, '#000');
    const uniq = Array.from(new Set(widths.map((w) => Math.round(w * 1000))));
    expect(uniq.length).toBeGreaterThan(1); // 线宽随笔内进度变化
  });
});

// ===== 5. 整字显现合并后行为 =====

describe('C5 整字显现统一基元', () => {
  function mockCtx() {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      textAlign: '',
      textBaseline: '',
      font: '',
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D & { fillText: ReturnType<typeof vi.fn> };
  }
  const glyph = { x: 0, y: 0, size: 100, char: '永' } as GlyphPlacement;

  it('drawSongGlyph 与 drawRestrictedGlyph 均只 fillText 一次', () => {
    const a = mockCtx();
    drawSongGlyph(a, glyph, 1, '#000', 'serif');
    expect(a.fillText).toHaveBeenCalledTimes(1);
    const b = mockCtx();
    drawRestrictedGlyph(b, glyph, 1, '#000', 'serif');
    expect(b.fillText).toHaveBeenCalledTimes(1);
  });

  it('受限字库字号系数（0.95）大于宋体（0.92）', () => {
    const a = mockCtx();
    drawSongGlyph(a, glyph, 1, '#000', 'serif');
    const songFont = Number(String((a as unknown as { font: string }).font).match(/(\d+)px/)?.[1]);
    const b = mockCtx();
    drawRestrictedGlyph(b, glyph, 1, '#000', 'serif');
    const restrFont = Number(String((b as unknown as { font: string }).font).match(/(\d+)px/)?.[1]);
    expect(restrFont).toBeGreaterThan(songFont);
  });

  it('progress<=0 不绘制', () => {
    const a = mockCtx();
    drawSongGlyph(a, glyph, 0, '#000');
    expect(a.fillText).not.toHaveBeenCalled();
  });

  it('墨渗渐显：progress 增大时 globalAlpha 单调不减', () => {
    const alphas: number[] = [];
    for (const p of [0.25, 0.5, 0.75, 1]) {
      const c = mockCtx();
      Object.defineProperty(c, 'globalAlpha', {
        get: () => alphas[alphas.length - 1] ?? 0,
        set: (v: number) => alphas.push(v),
        configurable: true,
      });
      drawSongGlyph(c, glyph, p, '#000', 'serif');
    }
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeGreaterThanOrEqual(alphas[i - 1] - 1e-9);
    }
  });
});

// ===== 6. 竖排布局为逐笔提供正确方块 =====

describe('C5 竖排布局逐笔方块', () => {
  it('竖排 glyph 方块互不重叠（同列纵向间隔 = rowHeight ≥ size）', () => {
    const r = layoutText({ text: '床前明月光', width: 1080, height: 1920, fontSize: 96, path: 'kai' });
    const byCol = new Map<number, typeof r.glyphs>();
    for (const g of r.glyphs) {
      const arr = byCol.get(g.col) ?? [];
      arr.push(g);
      byCol.set(g.col, arr);
    }
    for (const [, arr] of byCol) {
      arr.sort((a, b) => a.row - b.row);
      for (let i = 1; i < arr.length; i++) {
        const prevBottom = arr[i - 1].y + arr[i - 1].size;
        expect(arr[i].y).toBeGreaterThanOrEqual(prevBottom);
      }
    }
  });

  it('竖排各列横向间隔 = colWidth ≥ size', () => {
    const r = layoutText({
      text: '床前明月光疑是地上霜举头望明月低头思故乡',
      width: 1080,
      height: 600,
      fontSize: 96,
      path: 'kai',
    });
    const xs = Array.from(new Set(r.glyphs.map((g) => g.x))).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(r.colWidth);
    }
  });

  it('逐笔方块尺寸等于 fontSize（笔画坐标映射的空间基准）', () => {
    const r = layoutText({ text: '永', width: 1080, height: 1920, fontSize: 96, path: 'kai' });
    expect(r.glyphs[0].size).toBe(96);
  });

  it('竖排书写顺序：先下后左（列优先）', () => {
    const r = layoutText({ text: '甲乙丙丁', width: 1080, height: 400, fontSize: 96, path: 'kai' });
    const ordered = [...r.glyphs].sort((a, b) => a.order - b.order);
    for (const g of ordered.slice(1)) {
      const prev = ordered[ordered.indexOf(g) - 1];
      // 顺序推进：同行（同列）下一行，或换到左列
      const ok = (g.col === prev.col && g.row === prev.row + 1) || g.col === prev.col + 1;
      expect(ok).toBe(true);
    }
  });
});
