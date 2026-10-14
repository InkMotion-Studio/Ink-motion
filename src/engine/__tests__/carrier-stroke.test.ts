import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CARRIER_PLUGINS, renderCarrier } from '@/engine/carrier';
import { drawKaiGlyph, drawSongGlyph, isBlockedPath, loadStrokeData } from '@/engine/stroke';
import type { GlyphPlacement } from '@/engine/types';

function mockCtx() {
  const calls: Record<string, unknown[][]> = { fillRect: [], strokeRect: [], fillText: [], drawImage: [] };
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
    font: '',
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: (...a: unknown[]) => calls.fillRect.push(a),
    strokeRect: (...a: unknown[]) => calls.strokeRect.push(a),
    fillText: (...a: unknown[]) => calls.fillText.push(a),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const glyph = (over: Partial<GlyphPlacement> = {}): GlyphPlacement => ({
  char: '永',
  col: 0,
  row: 0,
  x: 10,
  y: 20,
  size: 96,
  order: 0,
  path: 'kai',
  strokeCount: 5,
  isPunct: false,
  ...over,
});

describe('N2.4/N2.5 载体引擎', () => {
  it('宣纸与竹简均已注册且可渲染', () => {
    expect(CARRIER_PLUGINS.paper.type).toBe('paper');
    expect(CARRIER_PLUGINS.bamboo.type).toBe('bamboo');
    const { ctx, calls } = mockCtx();
    renderCarrier(ctx, 'paper', 1080, 1920, { backgroundColor: '#f4ecd8' });
    renderCarrier(ctx, 'bamboo', 1080, 1920, { backgroundColor: '#c9b083' });
    expect(calls.fillRect.length).toBeGreaterThan(2);
  });

  it('宣纸含上下轴杆（宽度铺满）', () => {
    const { ctx, calls } = mockCtx();
    renderCarrier(ctx, 'paper', 1080, 1920, { backgroundColor: '#f4ecd8' });
    const bars = calls.fillRect.filter((a) => a[2] === 1080);
    expect(bars.length).toBeGreaterThanOrEqual(2);
  });

  it('竹简由多个竹片组成', () => {
    const { ctx, calls } = mockCtx();
    renderCarrier(ctx, 'bamboo', 1080, 1920, { backgroundColor: '#c9b083' });
    // 每片 fillRect(x,0,w,height) 高度=1920
    const slats = calls.fillRect.filter((a) => a[3] === 1920);
    expect(slats.length).toBeGreaterThan(5);
  });
});

describe('N2.2 笔画引擎', () => {
  it('宋体整字：progress<=0 不绘制，progress>0 绘制且透明度受限', () => {
    const { ctx, calls } = mockCtx();
    drawSongGlyph(ctx, glyph({ path: 'song' }), 0, '#000');
    expect(calls.fillText.length).toBe(0);
    drawSongGlyph(ctx, glyph({ path: 'song' }), 0.5, '#000');
    expect(calls.fillText.length).toBe(1);
    expect(ctx.globalAlpha).toBeLessThanOrEqual(1);
  });

  it('楷体逐笔：整字 progress=1 时绘制全部笔画中线', () => {
    const { ctx } = mockCtx();
    const strokeSpy = vi.spyOn(ctx, 'stroke');
    const data = {
      strokes: ['', ''],
      medians: [
        [
          [100, 100],
          [200, 200],
        ],
        [
          [300, 300],
          [400, 400],
        ],
      ],
    };
    drawKaiGlyph(ctx, glyph(), data, 1, '#000');
    expect(strokeSpy).toHaveBeenCalledTimes(2);
  });

  it('progress=0 不绘制任何笔画', () => {
    const { ctx } = mockCtx();
    const strokeSpy = vi.spyOn(ctx, 'stroke');
    drawKaiGlyph(
      ctx,
      glyph(),
      {
        strokes: [''],
        medians: [
          [
            [0, 0],
            [10, 10],
          ],
        ],
      },
      0,
      '#000',
    );
    expect(strokeSpy).not.toHaveBeenCalled();
  });

  it('V1.0 古文字路径不再阻塞（D-V1-01：受限字库整字显现）', () => {
    expect(isBlockedPath('seal')).toBe(false);
    expect(isBlockedPath('kai')).toBe(false);
    expect(isBlockedPath('song')).toBe(false);
  });
});

describe('N2.2 笔画数据加载降级', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('网络失败返回 null（触发整字降级）且不抛错', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as never;
    const data = await loadStrokeData('镸'); // 冷字，避免命中此前缓存
    expect(data).toBeNull();
  });
});
