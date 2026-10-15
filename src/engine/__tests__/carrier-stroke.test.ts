import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CARRIER_PLUGINS, renderCarrier } from '@/engine/carrier';
import {
  drawKaiGlyph,
  drawSongGlyph,
  isBlockedPath,
  loadStrokeData,
  isCjkWithOrder,
  buildStrokePaths,
} from '@/engine/stroke';
import { getKaiOutline } from '@/engine/outline';
import {
  primeCustomStrokes,
  __resetCustomStrokes,
  getCustomStrokeOrder,
} from '@/engine/customStroke';
import { invalidateStrokeDataCache } from '@/engine/stroke';
import type { GlyphPlacement } from '@/engine/types';
import { createMockCtx } from './helpers/mockCanvas';

function mockCtx() {
  // V2-C7 C6：改用共享 Canvas 2D 替身（覆盖材质层所需的全部 API）
  return createMockCtx();
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

  // C3：drawKaiGlyph 消费 buildStrokePaths 产出的分段笔画路径（轮廓·笔顺驱动逐笔）。
  it('楷体逐笔：整字 progress=1 时绘制全部笔画分段', () => {
    const { ctx } = mockCtx();
    const strokeSpy = vi.spyOn(ctx, 'stroke');
    // 构造一个 2 笔的轮廓段序列（每笔 2 段直线），验证 progress=1 全绘制
    const paths = {
      strokes: [
        [
          { x0: 0, y0: 0, x1: 10, y1: 10, len: 14 },
          { x0: 10, y0: 10, x1: 20, y1: 20, len: 14 },
        ],
        [
          { x0: 20, y0: 20, x1: 30, y1: 30, len: 14 },
          { x0: 30, y0: 30, x1: 40, y1: 40, len: 14 },
        ],
      ],
      total: 56,
    };
    drawKaiGlyph(ctx, glyph(), paths, 1, '#000');
    // 2 笔 × 2 段 = 4 次 stroke()（drawSegFull 每段独立 beginPath+stroke）
    expect(strokeSpy).toHaveBeenCalledTimes(4);
  });

  it('progress=0 不绘制任何笔画', () => {
    const { ctx } = mockCtx();
    const strokeSpy = vi.spyOn(ctx, 'stroke');
    const paths = {
      strokes: [[{ x0: 0, y0: 0, x1: 10, y1: 10, len: 14 }]],
      total: 14,
    };
    drawKaiGlyph(ctx, glyph(), paths, 0, '#000');
    expect(strokeSpy).not.toHaveBeenCalled();
  });

  it('buildStrokePaths：按笔数均匀切分整字轮廓为 N 段', () => {
    // 一个简单外轮廓（矩形）+ 一笔，strokeCount=2 → 应得到 2 段
    const outline = {
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
      unitsPerEm: 1024,
      xMin: 0,
      yMin: 0,
      xMax: 100,
      yMax: 100,
    } as unknown as Parameters<typeof buildStrokePaths>[0];
    const r = buildStrokePaths(outline, 2);
    expect(r.strokes.length).toBe(2);
    expect(r.total).toBeGreaterThan(0);
    // 两笔的段数之和 = 展平后的总段数（此处矩形展平为 4 段直线）
    const totalSegs = r.strokes.reduce((s, x) => s + x.length, 0);
    expect(totalSegs).toBe(4);
  });

  it('V1.0/V2-C2 受限字库路径不再阻塞（D-V1-01：整字显现）', () => {
    expect(isBlockedPath('seal')).toBe(false);
    expect(isBlockedPath('li')).toBe(false);
    expect(isBlockedPath('kai')).toBe(false);
    expect(isBlockedPath('song')).toBe(false);
  });
});

describe('N2.2 C2 权威笔顺加载（零 CDN）', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 模拟运行期本地 strokeorder 资源（public/strokeorder/*），不依赖外部网络
  const manifestJson = JSON.stringify({
    generatedBy: 'test',
    source: 'cnchar',
    encoding: { j: '横', e: '竖', s: '撇', l: '竖钩', g: '横折', d: '点', n: '捺', k: '横折提' },
    range: { start: 0x4e00, end: 0x9fff },
    total: 3,
    missing: 0,
    chunks: [{ file: 'strokes-4e00-9fff.json', start: 0x4e00, end: 0x9fff, chars: 3 }],
  });
  const chunkJson = JSON.stringify({ 永: 'kresl', 水: 'gesl', 中: 'fcjf' });

  function mockLocalFetch(): ReturnType<typeof vi.fn> {
    const fn = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('strokeorder.manifest.json')) {
        return new Response(manifestJson, { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (u.includes('strokes-')) {
        return new Response(chunkJson, { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response('', { status: 404 });
    });
    globalThis.fetch = fn as unknown as typeof fetch;
    return fn;
  }

  it('本地权威表收录的汉字返回笔顺序列', async () => {
    mockLocalFetch();
    const data = await loadStrokeData('永'); // 永字八法，权威表必收录
    expect(data).not.toBeNull();
    expect(data!.order).toBe('kresl');
    expect(data!.source).toBe('authority');
    expect(data!.strokeCount).toBe(data!.order.length);
  });

  it('非 CJK 字符（标点/字母/数字）返回 null，且不请求任何 hanzi-writer CDN', async () => {
    const fetchSpy = mockLocalFetch();
    for (const ch of ['，', 'a', '1', '🎉']) {
      const data = await loadStrokeData(ch);
      expect(data).toBeNull();
    }
    // 根除 BUG-003：绝不向 hanzi-writer CDN 发起请求（无 404 泛洪）
    const cdnCalls = fetchSpy.mock.calls.filter((c) => String(c[0]).includes('hanzi-writer'));
    expect(cdnCalls).toHaveLength(0);
  });

  it('isCjkWithOrder 正确区分 CJK 与符号', () => {
    expect(isCjkWithOrder('永')).toBe(true);
    expect(isCjkWithOrder('，')).toBe(false);
    expect(isCjkWithOrder('a')).toBe(false);
  });
});

describe('N2.2 C3 楷体轮廓加载（零网络）', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 模拟运行期本地 kaioutline 资源（public/kaioutline/*），不依赖外部网络
  const manifestJson = JSON.stringify({
    source: 'LXGW WenKai Lite',
    range: { start: 0x4e00, end: 0x9fff },
    unitsPerEm: 1024,
    total: 2,
    chunks: [{ file: 'strokes-4e00-9fff.json', start: 0x4e00, end: 0x9fff, chars: 2 }],
  });
  // 紧凑数组格式：contours[].points = [x,y,on, ...]
  const chunkJson = JSON.stringify({
    永: {
      contours: [{ points: [0, 0, 1, 100, 0, 1, 100, 100, 1, 0, 100, 1], length: 400 }],
      unitsPerEm: 1024,
      xMin: 0,
      yMin: 0,
      xMax: 100,
      yMax: 100,
    },
  });

  function mockKaiFetch(): ReturnType<typeof vi.fn> {
    const fn = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('kaioutline.manifest.json')) {
        return new Response(manifestJson, { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (u.includes('strokes-')) {
        return new Response(chunkJson, { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response('', { status: 404 });
    });
    globalThis.fetch = fn as unknown as typeof fetch;
    return fn;
  }

  it('本地楷体轮廓：CJK 汉字返回 OutlineGlyph，且紧凑数组正确还原为点', async () => {
    mockKaiFetch();
    const o = await getKaiOutline('永');
    expect(o).not.toBeNull();
    expect(o!.contours.length).toBe(1);
    // 4 个控制点（[x,y,on]×4）
    expect(o!.contours[0].points.length).toBe(4);
    expect(o!.contours[0].points[0]).toEqual({ x: 0, y: 0, on: true });
    expect(o!.unitsPerEm).toBe(1024);
  });

  it('非 CJK 字符返回 null，且不请求任何外部字体/CDN', async () => {
    const fetchSpy = mockKaiFetch();
    for (const ch of ['，', 'a', '1', '🎉']) {
      const o = await getKaiOutline(ch);
      expect(o).toBeNull();
    }
    const external = fetchSpy.mock.calls.filter(
      (c) => String(c[0]).includes('hanzi-writer') || String(c[0]).includes('http'),
    );
    expect(external).toHaveLength(0); // 仅本地相对路径，零外部请求
  });
});

describe('V2-C7 C4 C 层用户定制优先级', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetCustomStrokes();
    invalidateStrokeDataCache();
  });

  it('C 层定制优先于 A+B 权威表（命中则 source=user）', async () => {
    // A+B 表内 "永" 为 kresl；注入定制覆盖为 "sl"
    primeCustomStrokes([
      { id: '永', char: '永', order: 'sl', createdAt: 0, updatedAt: 0 },
    ]);
    globalThis.fetch = vi.fn(async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    const data = await loadStrokeData('永');
    expect(data?.source).toBe('user');
    expect(data?.order).toBe('sl');
    expect(data?.strokeCount).toBe(2);
  });

  it('C 层无定制时回退 A+B 权威表', async () => {
    // 无定制；mock 本地 strokeorder 资源
    const manifestJson = JSON.stringify({
      source: 'cnchar',
      encoding: {},
      range: { start: 0x4e00, end: 0x9fff },
      total: 1,
      missing: 0,
      chunks: [{ file: 'strokes-4e00-9fff.json', start: 0x4e00, end: 0x9fff, chars: 1 }],
    });
    const chunkJson = JSON.stringify({ 永: 'kresl' });
    globalThis.fetch = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes('strokeorder.manifest.json')) return new Response(manifestJson, { status: 200 });
      if (u.includes('strokes-')) return new Response(chunkJson, { status: 200 });
      return new Response('', { status: 404 });
    }) as unknown as typeof fetch;
    const data = await loadStrokeData('永');
    expect(data?.source).toBe('authority');
    expect(data?.order).toBe('kresl');
  });

  it('getCustomStrokeOrder 命中/未命中语义正确', async () => {
    primeCustomStrokes([
      { id: '好', char: '好', order: 'msjegj', createdAt: 0, updatedAt: 0 },
    ]);
    expect(await getCustomStrokeOrder('好')).toBe('msjegj');
    expect(await getCustomStrokeOrder('水')).toBeNull();
  });
});
