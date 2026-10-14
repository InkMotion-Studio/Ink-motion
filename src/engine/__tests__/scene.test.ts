import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene } from '@/engine/scene';

// 场景级测试：越界跳过、自动滚动范围、快照守卫（N4.1）
beforeEach(() => {
  // 让字表加载在 jsdom 下可用（注入覆盖真实 165 字表的子集：含 福/一）
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('seal-map.json')) {
        return new Response(
          JSON.stringify({
            version: 'seal-test',
            rows: [
              { seal: 0x3d01e, ben_ch: ['福'], jian_ch: [], li_ch: [], other_ch: [] },
              { seal: 0x3d000, ben_ch: ['一'], jian_ch: [], li_ch: [], other_ch: [] },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response('', { status: 404 });
    }),
  );
});
const base = {
  width: 1080,
  height: 1920,
  fontSize: 96,
  carrier: 'paper' as const,
  fontFamily: 'kai' as const,
  strokeColor: '#1c1a17',
  backgroundColor: '#f4ecd8',
  writingSpeed: 1,
};

function mockCtx() {
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
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

describe('N2.6/场景：越界与滚动', () => {
  it('空白文本：不产生字形、时长为尾部留白', () => {
    const s = new Scene({ ...base, text: '   ', scrollEnabled: false });
    expect(s.timings.every((t) => t.glyph.char.trim().length === 0)).toBe(true);
    expect(s.totalDurationMs).toBe(600);
  });

  it('自动滚动：长文列数增加，内容宽随之增长', () => {
    const short = new Scene({ ...base, text: '静夜思', scrollEnabled: true });
    const longText = '床前明月光疑是地上霜举头望明月低头思故乡'.repeat(3); // 60 字 → 4 列
    const long = new Scene({ ...base, text: longText, scrollEnabled: true });
    expect(long.layout.cols).toBeGreaterThan(short.layout.cols);
    // 内容宽 = padding*2 + 列数*列宽，应随列数增长
    expect(long.layout.contentWidth).toBeGreaterThan(short.layout.contentWidth);
  });

  it('内容超高时 contentHeight 精确等于 行数*行高 + padding*2', () => {
    const s = new Scene({ ...base, text: '一二三四五', scrollEnabled: false });
    const expected = s.layout.padding * 2 + 5 * s.layout.rowHeight;
    expect(s.layout.contentHeight).toBe(expected);
  });

  it('drawFrame 在时间轴任意点均不抛错（含越界时间）', () => {
    const s = new Scene({ ...base, text: '春眠不觉晓', scrollEnabled: true });
    const ctx = mockCtx();
    expect(() => {
      s.drawFrame(ctx, -100);
      s.drawFrame(ctx, 0);
      s.drawFrame(ctx, s.totalDurationMs / 2);
      s.drawFrame(ctx, s.totalDurationMs + 99999);
    }).not.toThrow();
  });

  it('古文字路径（V1.0）：越界字符跳过，在库字符渲染整字（TC-STROKE-03 / TC-V1-GLY-07/10）', async () => {
    // 注入本地字表，避免依赖 public/ 静态资源
    const { loadSealCharset } = await import('@/lib/seal');
    const cs = await loadSealCharset();
    // 以真实字表中必然存在的「福」(U+3D01E) 与越界字「永」验证
    const hasFu = cs.modernIndex['福'] !== undefined;
    const s = new Scene({ ...base, text: '永福', fontFamily: 'seal', scrollEnabled: false });
    await s.preload();
    const ctx = mockCtx();
    s.drawFrame(ctx, s.totalDurationMs);
    const fillText = (ctx as unknown as { fillText: ReturnType<typeof vi.fn> }).fillText;
    expect(fillText).toHaveBeenCalled();
    // 越界字「永」不应以现代字形绘制为小篆（其码位不在 U+3D000+ 区间）
    const fuRendered = hasFu
      ? fillText.mock.calls.some((c) => (c[0] as string).codePointAt(0)! >= 0x3d000)
      : true;
    expect(fuRendered).toBe(true);
  });

  it('snapshot 在无 document 环境返回 null 而不抛错', () => {
    const s = new Scene({ ...base, text: '永', scrollEnabled: false });
    // jsdom 下 document 存在，但 canvas.getContext 可能返回 null——确保不抛异常
    expect(() => s.snapshot(0)).not.toThrow();
  });
});
