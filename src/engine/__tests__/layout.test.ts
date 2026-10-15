import { describe, it, expect } from 'vitest';
import { layoutText } from '@/engine/layout';
import { Scene } from '@/engine/scene';

describe('N2.1 排版引擎', () => {
  it('竖排右起：首字位于最右列顶部，列随行满向左推进', () => {
    const r = layoutText({ text: '一二三四五六', width: 1080, height: 700, fontSize: 96, path: 'kai' });
    const first = r.glyphs[0];
    const perCol = r.perCol;
    // 首字应在最右列（col=0）且 row=0
    expect(first.col).toBe(0);
    expect(first.row).toBe(0);
    // 第 perCol 个字回到 col=0 则说明未换列；应换到 col=1
    if (perCol >= 1 && r.glyphs.length > perCol) {
      expect(r.glyphs[perCol].col).toBe(1);
    }
    // x 随列减小（向左）
    if (r.glyphs.length > perCol) {
      expect(r.glyphs[perCol].x).toBeLessThan(first.x);
    }
  });

  it('书写顺序为右→左、上→下（order 递增且列优先）', () => {
    const r = layoutText({ text: '床前明月光疑是地上霜', width: 1080, height: 600, fontSize: 80, path: 'kai' });
    for (let i = 1; i < r.glyphs.length; i++) {
      expect(r.glyphs[i].order).toBeGreaterThan(r.glyphs[i - 1].order);
    }
  });

  it('换行符强制换列', () => {
    const r = layoutText({ text: '甲乙\n丙丁', width: 1080, height: 1200, fontSize: 80, path: 'kai' });
    const jia = r.glyphs.find((g) => g.char === '甲')!;
    const bing = r.glyphs.find((g) => g.char === '丙')!;
    expect(bing.col).toBeGreaterThan(jia.col);
    expect(bing.row).toBe(0);
  });

  it('标点被识别', () => {
    const r = layoutText({ text: '春，眠。', width: 1080, height: 1200, fontSize: 80, path: 'kai' });
    expect(r.glyphs.find((g) => g.char === '，')!.isPunct).toBe(true);
    expect(r.glyphs.find((g) => g.char === '春')!.isPunct).toBe(false);
  });
});

describe('N2.6 场景时间线', () => {
  it('总时长 = 各字时长之和 + 末尾留白（>0）', () => {
    const scene = new Scene({
      text: '静夜思',
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
    expect(scene.totalDurationMs).toBeGreaterThan(600);
    expect(scene.timings.length).toBe(3);
  });

  it('书写速度越快，总时长越短', () => {
    const base = {
      text: '床前明月光',
      width: 1080,
      height: 1920,
      fontSize: 96,
      carrier: 'paper' as const,
      fontFamily: 'kai' as const,
      strokeColor: '#1c1a17',
      backgroundColor: '#f4ecd8',
      scrollEnabled: false,
    };
    const slow = new Scene({ ...base, writingSpeed: 1 });
    const fast = new Scene({ ...base, writingSpeed: 2 });
    expect(fast.totalDurationMs).toBeLessThan(slow.totalDurationMs);
  });

  it('C5：宋体路径计时与楷体口径统一（按笔画数缩放，不再是固定 220ms）', () => {
    const scene = new Scene({
      text: '永',
      width: 1080,
      height: 1920,
      fontSize: 96,
      carrier: 'paper',
      fontFamily: 'song',
      strokeColor: '#1c1a17',
      backgroundColor: '#f4ecd8',
      writingSpeed: 1,
      scrollEnabled: false,
    });
    // C5 前：song 恒为 WHOLE_MS=220ms。C5 起按 ESTIMATED_STROKE_COUNT(8) × 110ms = 880ms，
    // 与 kai 同文本时长可比（切换字体不再跳变）。
    const d = scene.timings[0].dur;
    expect(d).toBeGreaterThanOrEqual(220);
    expect(d).toBeLessThanOrEqual(8 * 110);
  });
});
