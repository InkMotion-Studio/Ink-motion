// V2-C2 N2.3：轮廓描边绘制单测（弧长截断 + 映射）。
// 使用轻量 fake CanvasRenderingContext2D 记录调用，验证进度语义与降级契约。
import { describe, it, expect } from 'vitest';
import { drawGlyphOutline } from '../stroke';
import type { OutlineGlyph } from '../outline';
import type { GlyphPlacement } from '../types';

interface Call {
  op: string;
  args: number[];
}

function makeCtx(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const rec =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ op, args: args.filter((a) => typeof a === 'number') as number[] });
    };
  const ctx = {
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    scale: rec('scale'),
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    stroke: rec('stroke'),
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const glyph: GlyphPlacement = {
  char: '字',
  col: 0,
  row: 0,
  x: 0,
  y: 0,
  size: 100,
  order: 0,
  path: 'seal',
  strokeCount: 1,
  isPunct: false,
};

// 一个正方形轮廓：边长 100（点均为 on-curve）
const square: OutlineGlyph = {
  contours: [
    {
      points: [
        { x: 0, y: 0, on: true },
        { x: 100, y: 0, on: true },
        { x: 100, y: 100, on: true },
        { x: 0, y: 100, on: true },
      ],
      length: 400,
    },
  ],
  unitsPerEm: 1000,
  xMin: 0,
  yMin: 0,
  xMax: 100,
  yMax: 100,
};

describe('V2-C2 N2.3 stroke：drawGlyphOutline', () => {
  it('progress <= 0 时不绘制（无 stroke 调用）', () => {
    const { ctx, calls } = makeCtx();
    drawGlyphOutline(ctx, glyph, square, 0, '#000');
    expect(calls.some((c) => c.op === 'stroke')).toBe(false);
  });

  it('progress = 1 时绘制完整轮廓（4 条闭合边）', () => {
    const { ctx, calls } = makeCtx();
    drawGlyphOutline(ctx, glyph, square, 1, '#000');
    const lineTos = calls.filter((c) => c.op === 'lineTo').length;
    expect(lineTos).toBe(4); // 4 条边
    expect(calls.some((c) => c.op === 'stroke')).toBe(true);
  });

  it('progress = 0.25 时描绘 1/4 弧长（截断收尾于第一条边内部）', () => {
    const { ctx, calls } = makeCtx();
    drawGlyphOutline(ctx, glyph, square, 0.25, '#000');
    const lineTos = calls.filter((c) => c.op === 'lineTo');
    // 周长 400，0.25 → 100，恰为第一条边全长 → 第一条边完整，stop 于第二条边起点
    expect(lineTos.length).toBe(1);
    const last = lineTos[lineTos.length - 1].args;
    expect(last[0]).toBeCloseTo(100, 0);
  });

  it('progress = 0.375 时截断于第二条边内部（弧长 150）', () => {
    const { ctx, calls } = makeCtx();
    drawGlyphOutline(ctx, glyph, square, 0.375, '#000');
    const lineTos = calls.filter((c) => c.op === 'lineTo');
    // 第一条边完整(0->100) + 第二条边部分(走到 150，即 x=100,y=50)
    expect(lineTos.length).toBe(2);
    const last = lineTos[lineTos.length - 1].args;
    expect(last[0]).toBeCloseTo(100, 0);
    expect(last[1]).toBeCloseTo(50, 0);
  });

  it('应用 save/restore 且设置 strokeStyle 颜色', () => {
    const { ctx, calls } = makeCtx();
    drawGlyphOutline(ctx, glyph, square, 1, '#ff0000');
    expect(calls[0].op).toBe('save');
    expect(calls[calls.length - 1].op).toBe('restore');
    expect((ctx as unknown as { strokeStyle: string }).strokeStyle).toBe('#ff0000');
  });

  it('空轮廓不绘制（无 stroke 调用）', () => {
    const { ctx, calls } = makeCtx();
    const empty: OutlineGlyph = { ...square, contours: [] };
    drawGlyphOutline(ctx, glyph, empty, 1, '#000');
    expect(calls.some((c) => c.op === 'stroke')).toBe(false);
  });
});
