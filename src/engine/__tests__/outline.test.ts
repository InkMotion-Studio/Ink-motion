// V2-C2 N2.3：轻量 TrueType 轮廓解析单测。
// 这些用例不依赖真实字体资产（资产可能未随包）：无资产时验证「失败即 null」的静默降级契约；
// 有内置合成 TTF 时验证真实解析路径。
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseGlyphOutline,
  hasOutline,
  totalOutlineLength,
  getCachedOutline,
  __clearOutlineCache,
} from '../outline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYNTHETIC_TTF = join(__dirname, 'fixtures', 'synthetic.ttf');

/** 在 Node 测试环境用本地 fixture 冒充 fetch 响应（jsdom 无真实网络）。 */
function mockFetchFromFile(url: string, filePath: string) {
  const bytes = readFileSync(filePath);
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const u = typeof input === 'string' ? input : input.toString();
    if (u === url) {
      return new Response(buf, { status: 200, headers: { 'content-type': 'font/ttf' } });
    }
    return new Response(null, { status: 404 });
  });
}

describe('V2-C2 N2.3 outline：TTF 轮廓解析', () => {
  beforeEach(() => {
    __clearOutlineCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('解析真实 TTF 的直线字形（矩形）', async () => {
    const spy = mockFetchFromFile('/synthetic.ttf', SYNTHETIC_TTF);
    const g = await parseGlyphOutline('/synthetic.ttf', 0x41); // 'A'
    spy.mockRestore();
    expect(g).not.toBeNull();
    expect(hasOutline(g)).toBe(true);
    expect(g!.unitsPerEm).toBe(1000);
    expect(g!.contours.length).toBe(1);
    expect(g!.contours[0].points.length).toBe(4);
    // 矩形 500×700 → 周长 2400
    expect(totalOutlineLength(g!)).toBeCloseTo(2400, 0);
    // bbox 与生成一致
    expect(g!.xMin).toBe(100);
    expect(g!.xMax).toBe(600);
    expect(g!.yMin).toBe(0);
    expect(g!.yMax).toBe(700);
  });

  it('解析含二次贝塞尔曲线的字形（展平后长度 > 直线估计）', async () => {
    const spy = mockFetchFromFile('/synthetic.ttf', SYNTHETIC_TTF);
    const g = await parseGlyphOutline('/synthetic.ttf', 0x42); // 'B'
    spy.mockRestore();
    expect(hasOutline(g)).toBe(true);
    const pts = g!.contours[0].points;
    // 存在非 on-curve（控制点）
    expect(pts.some((p) => !p.on)).toBe(true);
    expect(totalOutlineLength(g!)).toBeGreaterThan(0);
  });

  it('未映射码位返回 null', async () => {
    const spy = mockFetchFromFile('/synthetic.ttf', SYNTHETIC_TTF);
    const g = await parseGlyphOutline('/synthetic.ttf', 0x5b57); // '字' 未在 cmap
    spy.mockRestore();
    expect(g).toBeNull();
  });

  it('fetch 失败（404）时返回 null，不抛错', async () => {
    const g = await parseGlyphOutline('/fonts/__missing__/nope.ttf', 0x5b57);
    expect(g).toBeNull();
  });

  it('非 TrueType 数据（如 HTML/空字节）返回 null', async () => {
    const g = await parseGlyphOutline('data:application/octet-stream;base64,AAAA', 0x41);
    expect(g).toBeNull();
  });

  it('重复查询命中缓存并保持 null（不重复解析）', async () => {
    const url = '/fonts/__missing__/cache.ttf';
    await parseGlyphOutline(url, 0x41);
    expect(getCachedOutline(url, 0x41)).toBeNull(); // 已缓存 null
  });

  it('hasOutline 对 null/空轮廓返回 false', () => {
    expect(hasOutline(null)).toBe(false);
    expect(hasOutline(undefined)).toBe(false);
    expect(hasOutline({ contours: [], unitsPerEm: 1000, xMin: 0, yMin: 0, xMax: 0, yMax: 0 })).toBe(false);
  });

  it('totalOutlineLength 累加各轮廓周长', () => {
    const o = {
      contours: [
        { points: [], length: 10 },
        { points: [], length: 32.5 },
      ],
      unitsPerEm: 1000,
      xMin: 0,
      yMin: 0,
      xMax: 1,
      yMax: 1,
    };
    expect(totalOutlineLength(o)).toBeCloseTo(42.5, 5);
    expect(hasOutline(o)).toBe(true);
  });
});
