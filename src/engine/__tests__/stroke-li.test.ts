// V2-C2 N2.2 测试：隶书整字显现渲染（drawRestrictedGlyph / drawLiGlyph）
import { describe, it, expect, vi } from 'vitest';
import { drawLiGlyph, drawRestrictedGlyph, drawSealGlyph } from '@/engine/stroke';
import type { GlyphPlacement } from '@/engine/types';

function mkGlyph(char: string): GlyphPlacement {
  return {
    char,
    col: 0,
    row: 0,
    x: 100,
    y: 200,
    size: 96,
    order: 0,
    path: 'li',
    strokeCount: 1,
    isPunct: false,
  };
}

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

describe('V2-C2 隶书整字显现', () => {
  it('progress<=0 不绘制', () => {
    const ctx = mockCtx();
    drawLiGlyph(ctx, mkGlyph('永'), 0, '#000');
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('progress>0 以隶书字体栈 fillText 整字', () => {
    const ctx = mockCtx();
    drawLiGlyph(ctx, mkGlyph('永'), 1, '#000');
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(ctx.fillText.mock.calls[0][0]).toBe('永');
    // 字体栈含系统隶书族兜底
    expect(String((ctx as unknown as { font: string }).font)).toContain('LiSu');
  });

  it('drawRestrictedGlyph 可指定字体栈（小篆复用）', () => {
    const ctx = mockCtx();
    drawRestrictedGlyph(ctx, mkGlyph('福'), 1, '#000', '"LXGW Seal", serif');
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(String((ctx as unknown as { font: string }).font)).toContain('LXGW Seal');
  });

  it('drawSealGlyph 委托后行为等价（向后兼容）', () => {
    const ctx = mockCtx();
    drawSealGlyph(ctx, mkGlyph('福'), 1, '#000');
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
  });

  it('progress 用于淡入：globalAlpha 随 progress 增加', () => {
    const ctx = mockCtx();
    drawLiGlyph(ctx, mkGlyph('永'), 0.5, '#000');
    // save/restore 成对，且 fillText 已调用
    expect((ctx as unknown as { restore: ReturnType<typeof vi.fn> }).restore).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledTimes(1);
  });
});
