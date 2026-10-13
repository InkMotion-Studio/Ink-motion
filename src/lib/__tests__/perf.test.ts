import { describe, it, expect } from 'vitest';
import { planPerformance, subsetAdvice, iterateChunks } from '@/lib/perf';

describe('N4.3 性能策略', () => {
  it('短文全速不降帧', () => {
    const p = planPerformance(120, 60);
    expect(p.framerate).toBe(60);
    expect(p.degraded).toBe(false);
    expect(p.chunkSize).toBe(0);
  });

  it('中长文降帧至 24–30', () => {
    const p = planPerformance(1000, 60);
    expect(p.framerate).toBeLessThanOrEqual(30);
    expect(p.framerate).toBeGreaterThanOrEqual(24);
    expect(p.degraded).toBe(true);
  });

  it('超长文（>1500）分块且锁 24fps', () => {
    const p = planPerformance(5000, 60);
    expect(p.framerate).toBe(24);
    expect(p.chunkSize).toBe(200);
    expect(p.note).toBeTruthy();
  });

  it('5000 字上限场景可生成策略（不抛错）', () => {
    expect(() => planPerformance(5000, 30)).not.toThrow();
  });
});

describe('N4.3 分块迭代', () => {
  it('按块大小切分并保持顺序', async () => {
    const arr = Array.from({ length: 450 }, (_, i) => i);
    const out: number[] = [];
    for await (const chunk of iterateChunks(arr, 200)) {
      expect(chunk.length).toBeLessThanOrEqual(200);
      out.push(...chunk);
    }
    expect(out).toEqual(arr);
  });

  it('chunkSize<=0 时一次性返回', async () => {
    const arr = [1, 2, 3];
    const chunks: number[][] = [];
    for await (const c of iterateChunks(arr, 0)) chunks.push(c);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toEqual(arr);
  });
});

describe('N4.3 字体子集化建议', () => {
  it('少于 800 字不提示', () => {
    expect(subsetAdvice(500)).toBeNull();
  });
  it('超过 800 字给出按需加载说明', () => {
    expect(subsetAdvice(1200)).toContain('按需加载');
  });
});
