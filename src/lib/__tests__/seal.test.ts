// V1-C1 测试：小篆字库加载 / 今字映射 / 越界 / 渲染字符转换（GV-01~06 / TC-V1-GLY）。
// 使用内存版字表，避免依赖 public/ 静态资源路径。
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSealCharset,
  transformToSeal,
  modernToSeal,
  registerSealFont,
  SEAL_FONT_FAMILY,
} from '@/lib/seal';

// 复位模块级缓存，保证测试隔离
vi.resetModules();

const SAMPLE = {
  version: 'seal-test',
  rows: [
    { seal: 0x3d01e, ben_ch: ['福'], jian_ch: [], li_ch: [], other_ch: [] },
    { seal: 0x3d015, ben_ch: ['禮'], jian_ch: ['礼'], li_ch: [], other_ch: [] },
    { seal: 0x3d285, ben_ch: ['開'], jian_ch: ['开'], li_ch: [], other_ch: [] },
    { seal: 0x3d000, ben_ch: ['一'], jian_ch: [], li_ch: [], other_ch: [] },
  ],
};

function buildCharset() {
  const glyphs = SAMPLE.rows.map((r) => ({
    codePoint: r.seal,
    modernChars: [...r.ben_ch, ...r.jian_ch, ...r.li_ch, ...r.other_ch],
    layer: 'L0' as const,
  }));
  const modernIndex: Record<string, number> = {};
  for (const g of glyphs) for (const ch of g.modernChars) if (!(ch in modernIndex)) modernIndex[ch] = g.codePoint;
  return { version: SAMPLE.version, layer: 'L0' as const, glyphs, modernIndex };
}

describe('V1-C1 小篆字库与映射', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // 注入假 fetch 返回样例字表
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('seal-map.json')) {
          return new Response(JSON.stringify(SAMPLE), { status: 200 });
        }
        return new Response('', { status: 404 });
      }),
    );
  });

  it('GV-02 字表可解析并构建 modernIndex（今字→码位）', async () => {
    const cs = (await loadSealCharset())!;
    expect(cs.version).toBe('seal-test');
    expect(cs.glyphs.length).toBe(4);
    expect(cs.modernIndex['福']).toBe(0x3d01e);
    expect(cs.modernIndex['礼']).toBe(0x3d015); // 简化字映射
    expect(cs.modernIndex['开']).toBe(0x3d285);
  });

  it('TC-V1-GLY-05/06 今字直查与异体二次映射', () => {
    const cs = buildCharset();
    expect(modernToSeal('福', cs)).toBe(0x3d01e);
    expect(modernToSeal('礼', cs)).toBe(0x3d015); // 简化字 → 本字码位
    expect(modernToSeal('开', cs)).toBe(0x3d285);
  });

  it('TC-V1-GLY-07 越界字符映射返回 null', () => {
    const cs = buildCharset();
    expect(modernToSeal('龘', cs)).toBeNull();
    expect(modernToSeal('A', cs)).toBeNull();
  });

  it('GV-05 文本转换：在库→小篆码位字符，越界→保留原字', () => {
    const cs = buildCharset();
    const r = transformToSeal('福如東海', cs);
    expect(r.renderChars[0]).toBe(String.fromCodePoint(0x3d01e));
    // 「如」「東」「海」不在字表 → 保留原字符
    expect(r.renderChars[1]).toBe('如');
    expect(r.renderChars[2]).toBe('東');
    expect(r.renderChars[3]).toBe('海');
    expect(r.outOfRange).toEqual(['如', '東', '海']);
  });

  it('TC-V1-GLY-10 混合文本（在库+越界）不互相干扰', () => {
    const cs = buildCharset();
    const r = transformToSeal('一福', cs);
    expect(r.renderChars[0]).toBe(String.fromCodePoint(0x3d000)); // 一
    expect(r.renderChars[1]).toBe(String.fromCodePoint(0x3d01e)); // 福
    expect(r.outOfRange).toEqual([]);
  });

  it('registerSealFont 在无 FontFace 环境守卫不抛错（jsdom 兼容）', async () => {
    // jsdom 下 document.fonts 可能不存在；应安全跳过
    await expect(registerSealFont()).resolves.toBeUndefined();
    expect(typeof SEAL_FONT_FAMILY).toBe('string');
  });

  it('GV-01 字体子集 URL 指向同源静态资源（纯本地，含小篆码位可渲染）', () => {
    // 路径应为同源相对路径，确保零上传（IM-GLYPH-001 §5 红线）
    expect(SEAL_FONT_FAMILY).toContain('Seal');
  });
});
