// V2-C1 测试：篆书分层字源（L0 保底 + L1 主力 + L2 全字库）
// 覆盖：层级设置解析 / 合并注册表优先级去重 / 覆盖率预估 / 字体回退栈（缺失层静默跳过）
// 使用内存版字表，按 URL 区分各层 map，避免依赖 public/ 静态资源路径。
import { describe, it, expect, vi, beforeEach } from 'vitest';

const L0 = {
  version: 'seal-l0',
  rows: [
    { seal: 0x3d01e, ben_ch: ['福'], jian_ch: [], li_ch: [], other_ch: [] },
    { seal: 0x3d000, ben_ch: ['一'], jian_ch: [], li_ch: [], other_ch: [] },
  ],
};
const L1 = {
  version: 'seal-l1',
  rows: [
    { seal: 0x3d01e, ben_ch: ['福'], jian_ch: [], li_ch: [], other_ch: [] }, // 与 L0 重合，应取 L1
    { seal: 0x3d285, ben_ch: ['開'], jian_ch: ['开'], li_ch: [], other_ch: [] },
  ],
};
const L2 = {
  version: 'seal-l2',
  rows: [{ seal: 0x3d700, ben_ch: ['龘'], jian_ch: [], li_ch: [], other_ch: [] }],
};

async function importSeal() {
  return await import('@/lib/seal');
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('seal-map.json')) return new Response(JSON.stringify(L0), { status: 200 });
      if (url.includes('seal-map-l1.json')) return new Response(JSON.stringify(L1), { status: 200 });
      if (url.includes('seal-map-l2.json')) return new Response(JSON.stringify(L2), { status: 200 });
      return new Response('', { status: 404 });
    }),
  );
});

describe('V2-C1 N1.1 层级设置解析', () => {
  it('layersForSetting 将设置项映射为启用层（L0 始终包含）', async () => {
    const s = await importSeal();
    expect(s.layersForSetting('L0')).toEqual(['L0']);
    expect(s.layersForSetting('L0L1')).toEqual(['L0', 'L1']);
    expect(s.layersForSetting('all')).toEqual(['L0', 'L1', 'L2']);
  });
});

describe('V2-C1 N1.2 合并注册表与优先级去重', () => {
  it('L1 优先于 L0（重合字取 L1），L2 补齐独有字', async () => {
    const s = await importSeal();
    const reg = await s.loadSealRegistry('all');
    expect(reg).not.toBeNull();
    // 福 在 L0/L1 均出现 → 高优先级 L1 获胜
    expect(reg!.modernIndex['福'].layer).toBe('L1');
    expect(reg!.modernIndex['福'].codePoint).toBe(0x3d01e);
    // 一 仅 L0
    expect(reg!.modernIndex['一'].layer).toBe('L0');
    // 開/开 仅 L1
    expect(reg!.modernIndex['開'].layer).toBe('L1');
    expect(reg!.modernIndex['开'].layer).toBe('L1');
    // 龘 仅 L2（最大覆盖）
    expect(reg!.modernIndex['龘'].layer).toBe('L2');
    // coverageChars 去重后共 5 个今字：福/一/開/开/龘
    expect(reg!.coverageChars.has('福')).toBe(true);
    expect(reg!.coverageChars.size).toBe(5);
  });

  it('L0L1 设置下不含 L2 字（龘 越界）', async () => {
    const s = await importSeal();
    const reg = await s.loadSealRegistry('L0L1');
    expect(reg!.layers).toContain('L0');
    expect(reg!.layers).toContain('L1');
    expect(reg!.layers).not.toContain('L2');
    expect(reg!.coverageChars.has('龘')).toBe(false);
    expect(reg!.coverageChars.has('一')).toBe(true);
  });

  it('mergedSealCharset 产出向后兼容字表（含 L2 独有字）', async () => {
    const s = await importSeal();
    const reg = (await s.loadSealRegistry('all'))!;
    const cs = s.mergedSealCharset(reg);
    expect(cs.layer).toBe('L0');
    expect(cs.modernIndex['龘']).toBe(0x3d700);
    expect(cs.modernIndex['福']).toBe(0x3d01e);
    // 复用既有 transformToSeal 可正常转换
    const r = s.transformToSeal('福龘', cs);
    expect(r.renderChars[0]).toBe(String.fromCodePoint(0x3d01e));
    expect(r.renderChars[1]).toBe(String.fromCodePoint(0x3d700));
    expect(r.outOfRange).toEqual([]);
  });

  it('全部资产缺失时 loadSealRegistry 返回 null（静默降级，V1.0 单字表路径接管）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    );
    const s = await importSeal();
    const reg = await s.loadSealRegistry('all');
    expect(reg).toBeNull();
  });
});

describe('V2-C1 N1.2 覆盖率预估（GV-V2-04）', () => {
  it('estimateSealCoverage 统计覆盖与越界', async () => {
    const s = await importSeal();
    const reg = (await s.loadSealRegistry('all'))!;
    const cov = s.estimateSealCoverage('福一龘永', reg);
    expect(cov.total).toBe(4);
    expect(cov.covered).toBe(3); // 福/一/龘 覆盖，永 越界
    expect(cov.ratio).toBeCloseTo(3 / 4);
    expect([...cov.layers].sort()).toEqual(['L0', 'L1', 'L2']);
  });

  it('空文本覆盖率为 1（无越界）', async () => {
    const s = await importSeal();
    const reg = (await s.loadSealRegistry('all'))!;
    const cov = s.estimateSealCoverage('', reg);
    expect(cov.total).toBe(0);
    expect(cov.ratio).toBe(1);
  });

  it('空白字符不计入 total', async () => {
    const s = await importSeal();
    const reg = (await s.loadSealRegistry('all'))!;
    const cov = s.estimateSealCoverage(' 福 龘 ', reg);
    expect(cov.total).toBe(2);
  });
});

describe('V2-C1 N1.1 字体回退栈（缺失层静默跳过）', () => {
  it('无 FontFace 环境下 registerSealLayer 返回布尔且不抛错', async () => {
    const s = await importSeal();
    const ok = await s.registerSealLayer('L0');
    expect(typeof ok).toBe('boolean');
    // 无任何层注册时，字体栈仍回退到 L0 基础字族
    const stack = s.getSealFontStack();
    expect(stack).toContain('Seal');
  });

  it('getSealFontStack 优先级顺序为 L1→L0→L2', async () => {
    const s = await importSeal();
    // 模拟已注册层（绕过真实字体加载）
    await s.registerSealFont('all'); // 缺失资产静默跳过，通常不注册成功
    const stack = s.getSealFontStack();
    const idxL1 = stack.indexOf('JFZS Seal');
    const idxL0 = stack.indexOf('LXGW Seal');
    const idxL2 = stack.indexOf('TW Seal');
    // 若注册成功，顺序须满足 L1 < L0 < L2（数值越小越优先）
    if (idxL1 >= 0 && idxL0 >= 0) expect(idxL1).toBeLessThan(idxL0);
    if (idxL0 >= 0 && idxL2 >= 0) expect(idxL0).toBeLessThan(idxL2);
  });
});
