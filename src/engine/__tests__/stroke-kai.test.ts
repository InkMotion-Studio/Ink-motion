// V2.0 逐笔审核建议 1（前次 R5）：楷体「真逐笔」渲染断言。
//
// 两层覆盖：
//  1) drawKaiGlyph 单测 —— 严格按 medians 顺序逐笔：progress=0.5（n=2）时第 1 笔完整、
//     第 2 笔尚未出现；progress=1 时两笔全部绘制。复刻审核文档「先撇后捺」端到端语义。
//  2) Scene 集成 —— 注入真实 {strokes, medians} 数据后，drawFrame 走 drawKaiGlyph 矢量逐笔，
//     而非 drawSongGlyph 整字降级（证明 kai 优先于降级契约生效）；并反向断言数据缺失→降级。
//
// 风格与同目录 scene.test.ts 一致：普通对象 mockCtx + 行为断言（不依赖 vi.spyOn 跨模块拦截）。
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawKaiGlyph } from '@/engine/stroke';
import type { GlyphPlacement, HanziStrokeData } from '@/engine/types';

// ---- 通用 canvas mock：记录 moveTo/lineTo/stroke/fillText，其余方法 no-op ----
function mockCtx() {
  return {
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
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
  } as unknown as CanvasRenderingContext2D & {
    moveTo: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
  };
}

function mkGlyph(char: string, overrides: Partial<GlyphPlacement> = {}): GlyphPlacement {
  return {
    char,
    col: 0,
    row: 0,
    x: 100,
    y: 200,
    size: 96,
    order: 0,
    path: 'kai',
    strokeCount: 2,
    isPunct: false,
    ...overrides,
  };
}

// 两笔样本：第 1 笔 x∈[0,100]，第 2 笔 x∈[500,600] —— 坐标区间分离，便于断言"先第1笔后第2笔"
const KAI_SAMPLE: HanziStrokeData = {
  strokes: ['M 0 0 L 100 0', 'M 500 0 L 600 0'],
  medians: [
    [[0, 0], [50, 0], [100, 0]],
    [[500, 0], [550, 0], [600, 0]],
  ],
};

describe('N2.2 楷体真逐笔：drawKaiGlyph 顺序', () => {
  it('progress=0 不绘制任何笔画', () => {
    const ctx = mockCtx();
    drawKaiGlyph(ctx, mkGlyph('人'), KAI_SAMPLE, 0, '#000');
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('progress=0.5（n=2）第 1 笔完整、第 2 笔尚未出现', () => {
    const ctx = mockCtx();
    drawKaiGlyph(ctx, mkGlyph('人'), KAI_SAMPLE, 0.5, '#000');
    // drawn = progress * n = 1.0 → 第 1 笔完整（1 次 stroke），第 2 笔未开始
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    // 所有绘制点都落在第 1 笔区间 x∈[0,100]，未触及第 2 笔 x∈[500,600]
    const allX = [
      ...ctx.moveTo.mock.calls.map((c) => c[0]),
      ...ctx.lineTo.mock.calls.map((c) => c[0]),
    ];
    expect(Math.max(...allX)).toBeLessThanOrEqual(100);
    expect(Math.min(...allX)).toBeGreaterThanOrEqual(0);
  });

  it('progress 递增严格按笔顺：0.5 时第 2 笔坐标未出现', () => {
    const ctx = mockCtx();
    drawKaiGlyph(ctx, mkGlyph('人'), KAI_SAMPLE, 0.5, '#000');
    // 审核文档语义：先撇后捺 —— 第 2 笔起点 x=500 不应出现
    expect(ctx.lineTo.mock.calls.some((c) => c[0] >= 500)).toBe(false);
    expect(ctx.moveTo.mock.calls.some((c) => c[0] >= 500)).toBe(false);
  });

  it('progress=1.0 两笔全部绘制', () => {
    const ctx = mockCtx();
    drawKaiGlyph(ctx, mkGlyph('人'), KAI_SAMPLE, 1, '#000');
    expect(ctx.stroke).toHaveBeenCalledTimes(2);
    const allX = [
      ...ctx.moveTo.mock.calls.map((c) => c[0]),
      ...ctx.lineTo.mock.calls.map((c) => c[0]),
    ];
    expect(Math.max(...allX)).toBe(600); // 第 2 笔末端已绘制
  });

  it('单笔内线性进度 frac 影响本笔揭示长度（非整笔跳变）', () => {
    // 仅 1 笔样本，progress=0.5 → 该笔应画到约一半（末点 x 介于起点与终点之间）
    const one: HanziStrokeData = { strokes: ['M 0 0 L 100 0'], medians: [[[0, 0], [100, 0]]] };
    const ctx = mockCtx();
    drawKaiGlyph(ctx, mkGlyph('一', { strokeCount: 1 }), one, 0.5, '#000');
    const maxX = Math.max(...ctx.lineTo.mock.calls.map((c) => c[0]));
    // 50% 进度下末点应 ≈ 50，远小于完整 100，证明是"沿中线渐显"而非整笔出现
    expect(maxX).toBeGreaterThan(0);
    expect(maxX).toBeLessThan(100);
  });
});

describe('N2.2 楷体真逐笔：Scene 集成（kai 优先于整字降级）', () => {
  beforeEach(() => {
    // 注入本地笔画数据，模拟 npm run vendor:hanzi 后的 public/hanzi-data/
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (typeof url === 'string' && url.includes('/hanzi-data/')) {
          return new Response(
            JSON.stringify({
              strokes: ['M 0 0 L 100 0', 'M 500 0 L 600 0'],
              medians: [
                [[0, 0], [50, 0], [100, 0]],
                [[500, 0], [550, 0], [600, 0]],
              ],
            }),
            { status: 200 },
          );
        }
        return new Response('', { status: 404 });
      }),
    );
  });

  it('kai 字形有数据时走矢量逐笔（不整字 fillText 降级）', async () => {
    const { Scene } = await import('@/engine/scene');
    const s = new Scene({
      text: '人',
      width: 1080,
      height: 1920,
      fontSize: 96,
      carrier: 'paper',
      fontFamily: 'kai',
      strokeColor: '#1c1a17',
      backgroundColor: '#f4ecd8',
      writingSpeed: 1,
      scrollEnabled: false,
    });
    await s.preload();
    const ctx = mockCtx();
    s.drawFrame(ctx, s.totalDurationMs); // 完整进度

    // 主断言：'人' 未被整字 fillText；同时发生了矢量描边（drawKaiGlyph 路径生效）
    const fillTextArgs = ctx.fillText.mock.calls.map((c) => c[0]);
    expect(fillTextArgs).not.toContain('人');
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(0);
    // 交叉证据：矢量逐笔产生了 moveTo/lineTo，而非仅靠 fillText
    expect(ctx.moveTo.mock.calls.length).toBeGreaterThan(0);
  });

  it('kai 字形数据缺失时回退整字 fillText 降级', async () => {
    // 覆盖 beforeEach：hanzi-data 请求 404 → loadStrokeData 返回 null → 降级
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    );
    const { Scene } = await import('@/engine/scene');
    const s = new Scene({
      text: '鑫', // 大概率不在本地字库
      width: 1080,
      height: 1920,
      fontSize: 96,
      carrier: 'paper',
      fontFamily: 'kai',
      strokeColor: '#1c1a17',
      backgroundColor: '#f4ecd8',
      writingSpeed: 1,
      scrollEnabled: false,
    });
    await s.preload();
    const ctx = mockCtx();
    s.drawFrame(ctx, s.totalDurationMs);

    expect(ctx.fillText.mock.calls.map((c) => c[0])).toContain('鑫');
  });
});
