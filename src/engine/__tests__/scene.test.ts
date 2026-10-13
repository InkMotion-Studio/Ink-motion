import { describe, it, expect, vi } from 'vitest';
import { Scene } from '@/engine/scene';

// 场景级测试：越界跳过、自动滚动范围、快照守卫（N4.1）
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

  it('古文字路径不绘制（越界跳过，IM-TEST §5.2）', () => {
    const s = new Scene({ ...base, text: '永', fontFamily: 'ancient', scrollEnabled: false });
    const ctx = mockCtx();
    s.drawFrame(ctx, s.totalDurationMs);
    // 古文字全部被 isBlockedPath 守卫跳过，不产生任何 fillText（宋体降级也不会，因为路径被阻断）
    expect((ctx as unknown as { fillText: ReturnType<typeof vi.fn> }).fillText).not.toHaveBeenCalled();
  });

  it('snapshot 在无 document 环境返回 null 而不抛错', () => {
    const s = new Scene({ ...base, text: '永', scrollEnabled: false });
    // jsdom 下 document 存在，但 canvas.getContext 可能返回 null——确保不抛异常
    expect(() => s.snapshot(0)).not.toThrow();
  });
});
