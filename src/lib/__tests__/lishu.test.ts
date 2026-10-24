// V2-C2 N2.2 测试：隶书受限字库（映射 / 转换 / 覆盖率 / 字体栈 / 缺失静默跳过）
import { describe, it, expect, vi, beforeEach } from 'vitest';

const SAMPLE = {
  version: 'li-test',
  rows: [
    { code: 0x6c38, ben_ch: ['永'], jian_ch: [], li_ch: [], other_ch: [] },
    { code: 0x548c, ben_ch: ['和'], jian_ch: [], li_ch: [], other_ch: [] },
  ],
};

function buildCharset() {
  const glyphs = SAMPLE.rows.map((r) => ({
    codePoint: r.code,
    modernChars: [...r.ben_ch, ...r.jian_ch, ...r.li_ch, ...r.other_ch],
  }));
  const modernIndex: Record<string, number> = {};
  for (const g of glyphs) for (const ch of g.modernChars) if (!(ch in modernIndex)) modernIndex[ch] = g.codePoint;
  return { version: SAMPLE.version, glyphs, modernIndex };
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('V2-C2 隶书映射与转换', () => {
  it('字表存在：命中返回隶书码位，越界保留原字符', async () => {
    const { transformToLi } = await import('@/lib/lishu');
    const cs = buildCharset();
    const r = transformToLi('永龘和', cs);
    expect(r.renderChars[0]).toBe('永');
    expect(r.renderChars[1]).toBe('龘'); // 越界保留
    expect(r.renderChars[2]).toBe('和');
    expect(r.outOfRange).toEqual(['龘']);
  });

  it('字表缺失（null）：恒等映射，不拦截、无越界', async () => {
    const { transformToLi } = await import('@/lib/lishu');
    const r = transformToLi('永龘和', null);
    expect(r.renderChars).toEqual(['永', '龘', '和']);
    expect(r.outOfRange).toEqual([]);
  });

  it('空白字符不参与越界判定', async () => {
    const { transformToLi } = await import('@/lib/lishu');
    const cs = buildCharset();
    const r = transformToLi(' 永 龘 ', cs);
    expect(r.outOfRange).toEqual(['龘']);
    expect(r.renderChars).toEqual([' ', '永', ' ', '龘', ' ']);
  });

  it('modernToLi 单字直查', async () => {
    const { modernToLi } = await import('@/lib/lishu');
    const cs = buildCharset();
    expect(modernToLi('永', cs)).toBe(0x6c38);
    expect(modernToLi('龘', cs)).toBeNull();
  });
});

describe('V2-C2 隶书字表加载（缺失静默跳过）', () => {
  it('字表资产缺失（404）返回 null，不抛错', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const { loadLiCharset } = await import('@/lib/lishu');
    expect(await loadLiCharset()).toBeNull();
  });

  it('字表存在则解析出 modernIndex', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(SAMPLE), { status: 200 })),
    );
    const { loadLiCharset } = await import('@/lib/lishu');
    const cs = await loadLiCharset();
    expect(cs?.version).toBe('li-test');
    expect(cs?.modernIndex['永']).toBe(0x6c38);
  });
});

describe('V2-C2 隶书覆盖率预估（GV-V2-06）', () => {
  it('字表存在：统计覆盖与越界', async () => {
    const { estimateLiCoverage } = await import('@/lib/lishu');
    const cs = buildCharset();
    const cov = estimateLiCoverage('永龘和', cs);
    expect(cov.total).toBe(3);
    expect(cov.covered).toBe(2);
    expect(cov.ratio).toBeCloseTo(2 / 3);
  });

  it('字表缺失：视为全覆盖（不拦截）', async () => {
    const { estimateLiCoverage } = await import('@/lib/lishu');
    const cov = estimateLiCoverage('永龘和', null);
    expect(cov.total).toBe(3);
    expect(cov.covered).toBe(3);
    expect(cov.ratio).toBe(1);
  });
});

describe('V2-C2 隶书字体栈', () => {
  it('无字体注册时仍含系统隶书/衬线兜底', async () => {
    const { getLiFontStack, isLiFontReady } = await import('@/lib/lishu');
    const stack = getLiFontStack();
    expect(isLiFontReady()).toBe(false);
    expect(stack).toContain('LiSu');
    expect(stack).toContain('serif');
  });

  it('无 FontFace 环境下 registerLiFont 返回布尔且不抛错', async () => {
    const { registerLiFont } = await import('@/lib/lishu');
    const ok = await registerLiFont();
    expect(typeof ok).toBe('boolean');
  });
});
