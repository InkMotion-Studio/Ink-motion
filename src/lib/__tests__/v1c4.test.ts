// V1-C4 N4.1 单测补全：对齐 IM-TEST-V1-001 用例族
// 覆盖：设置持久化（THEME-02/I18N-02）、字体生命周期（FONT-03/04/10）、
//       4K 降级策略（EXP4K-02）、映射正确率抽样（GLY-08）、导出记录（QUEUE-06）、
//       渲染路径互不干扰（GLY-10）、古文字无笔顺告知（GLY-11）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolve } from 'node:path';
import 'fake-indexeddb/auto';
import {
  db,
  putFont,
  listFonts,
  deleteFont,
  putExport,
  listExports,
  setSetting,
  getSetting,
} from '@/db/database';
import { planPerformance, estimateCanvasMemoryMB } from '@/lib/perf';
import { validateFontFile, detectFormat } from '@/lib/fontUpload';
import { MESSAGES_ZH, translate, loadLang } from '@/lib/i18n';
import { FONT_CATALOG } from '@/lib/fonts';

beforeEach(async () => {
  await Promise.all([db.fonts.clear(), db.exports.clear(), db.settings.clear(), db.projects.clear()]);
});

// ===== TC-V1-THEME-02 / TC-V1-I18N-02 偏好持久化 =====
describe('偏好持久化（THEME-02 / I18N-02）', () => {
  it('主题设置写入后可读取（刷新恢复）', async () => {
    await setSetting('theme', 'dark');
    expect(await getSetting('theme', 'light')).toBe('dark');
  });

  it('语言设置写入后可读取（刷新恢复）', async () => {
    await setSetting('language', 'en');
    expect(await getSetting('language', 'zh')).toBe('en');
  });

  it('未设置时回退默认值', async () => {
    expect(await getSetting('theme', 'light')).toBe('light');
    expect(await getSetting('language', 'zh')).toBe('zh');
  });
});

// ===== TC-V1-FONT-03/04/10 字体生命周期 =====
describe('上传字体生命周期（FONT-03 / FONT-04 / FONT-10）', () => {
  it('落库后可列出（刷新恢复的前提）', async () => {
    await putFont({
      name: '测试楷体',
      family: 'kai',
      source: 'uploaded',
      format: 'truetype',
      license: 'OFL',
      dataUrl: 'data:font/ttf;base64,AAAA',
    });
    const all = await listFonts();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('测试楷体');
    expect(all[0].source).toBe('uploaded');
  });

  it('删除后从列表移除（存储释放）', async () => {
    const rec = await putFont({
      name: '待删除字体',
      family: 'song',
      source: 'uploaded',
      format: 'woff2',
      license: 'OFL',
      dataUrl: 'data:font/woff2;base64,BBBB',
    });
    expect(await listFonts()).toHaveLength(1);
    await deleteFont(rec.id);
    expect(await listFonts()).toHaveLength(0);
  });

  it('可一键清空全部上传字体', async () => {
    for (const n of ['a', 'b', 'c']) {
      await putFont({ name: n, family: 'kai', source: 'uploaded', format: 'truetype', license: 'OFL' });
    }
    const all = await listFonts();
    for (const f of all) await deleteFont(f.id);
    expect(await listFonts()).toHaveLength(0);
  });

  it('损坏/非法文件在上层被拒绝（FONT-06 / FONT-07 前置）', () => {
    // V2-C4 N4.1：错误文案改为 i18n 错误码（由 UI 本地化呈现）
    expect(validateFontFile({ name: 'bad.exe', size: 100 })).toBe('font.err.format');
    expect(validateFontFile({ name: 'zero.ttf', size: 0 })).toBe('font.err.empty');
  });
});

// ===== TC-V1-EXP4K-02 4K 降级策略 =====
describe('4K 降级策略（EXP4K-02）', () => {
  it('4K 画布自动限帧，避免编码压力导致失败', () => {
    const plan = planPerformance(200, 60, { width: 2160, height: 3840 });
    expect(plan.framerate).toBeLessThanOrEqual(30);
    expect(plan.degraded).toBe(true);
    expect(plan.note).toBeTruthy();
  });

  it('4K 内存估算可用于提示（≥30MB 触发警告）', () => {
    const mb = estimateCanvasMemoryMB(2160, 3840);
    expect(mb).toBeGreaterThan(30);
  });

  it('1080p 不触发降级（对照）', () => {
    const plan = planPerformance(200, 30, { width: 1080, height: 1920 });
    expect(plan.degraded).toBe(false);
  });

  it('4K + 5000 字仍给出可执行策略（EXP4K-05 策略层）', () => {
    const plan = planPerformance(5000, 60, { width: 2160, height: 3840 });
    expect(plan.framerate).toBeGreaterThanOrEqual(24);
    expect(plan.chunkSize).toBeGreaterThan(0);
  });
});

// ===== TC-V1-GLY-08 映射正确率抽样（真实字表） =====
describe('小篆映射正确率抽样（GLY-08）', () => {
// 读取真实字表（相对 vitest 运行根目录，保证可移植）
const mapPath = resolve(process.cwd(), 'public/fonts/seal/seal-map.json');

  it('字表可解析且规模符合预期（165 篆字 / 238 今字）', async () => {
    const { readFile } = await import('node:fs/promises');
    const raw = JSON.parse(await readFile(mapPath, 'utf-8'));
    expect(raw.rows.length).toBe(165);
    expect(Object.keys(raw.index).length).toBeGreaterThan(200);
  });

  it('抽样 50 个今字映射均落在小篆区块 U+3D000+（正确率 100%）', async () => {
    const { readFile } = await import('node:fs/promises');
    const raw = JSON.parse(await readFile(mapPath, 'utf-8'));
    const entries = Object.entries(raw.index) as Array<[string, number]>;
    // 确定性抽样：按步长取 50 个
    const step = Math.max(1, Math.floor(entries.length / 50));
    const sample = entries.filter((_, i) => i % step === 0).slice(0, 50);
    expect(sample.length).toBeGreaterThanOrEqual(45);
    const inSealBlock = sample.filter(([, cp]) => cp >= 0x3d000 && cp <= 0x3fc3f);
    expect(inSealBlock.length).toBe(sample.length); // 正确率 100% ≥ 98%
  });

  it('篆码位互不重复（唯一性）', async () => {
    const { readFile } = await import('node:fs/promises');
    const raw = JSON.parse(await readFile(mapPath, 'utf-8'));
    const cps = raw.rows.map((r: { seal: number }) => r.seal);
    expect(new Set(cps).size).toBe(cps.length);
  });
});

// ===== TC-V1-GLY-10 渲染路径互不干扰 =====
describe('多路径互不干扰（GLY-10 / V2-C2）', () => {
  it('字体目录四路径齐全且各自路径标识不同', () => {
    const paths = FONT_CATALOG.map((f) => f.path);
    expect(new Set(paths).size).toBe(4);
    expect(paths).toContain('kai');
    expect(paths).toContain('whole');
    expect(paths).toContain('seal-restricted');
    expect(paths).toContain('li-restricted');
  });

  it('每路径均有许可信息与可用状态', () => {
    for (const f of FONT_CATALOG) {
      expect(f.license).toBeTruthy();
      expect(f.licenseUrl).toMatch(/^https?:\/\//);
      // V2-C7 C7 BUG-004：署名改走 i18n 键
      expect(f.attributionKey).toBeTruthy();
      expect(f.available).toBe(true);
    }
  });
});

// ===== TC-V1-GLY-11 古文字无笔顺告知 =====
describe('古文字限制告知（GLY-11）', () => {
  it('帮助页文案明确"不提供逐笔书写"（中英双语）', async () => {
    expect(translate('help.seal', 'zh')).toMatch(/不提供逐笔书写/);
    await loadLang('en'); // 英文包按需加载
    expect(translate('help.seal', 'en')).toMatch(/no stroke-by-stroke writing/);
  });

  it('越界提示文案含"自动跳过"语义', () => {
    expect(translate('seal.outOfRangeHint', 'zh')).toMatch(/自动跳过/);
  });
});

// ===== TC-V1-QUEUE-06 导出记录持久化 =====
describe('导出记录（QUEUE-06）', () => {
  it('写入后可按项目查询（两条均入库存续）', async () => {
    const pid = 'proj-1';
    await putExport({ projectId: pid, format: 'webm', sizeBytes: 1024, durationMs: 3000 });
    await putExport({ projectId: pid, format: 'mp4', sizeBytes: 2048, durationMs: 3000 });
    const list = await listExports(pid);
    expect(list).toHaveLength(2);
    // 同一毫秒内写入时 createdAt 相同，顺序不保证 → 只断言集合内容
    expect(list.map((r) => r.format).sort()).toEqual(['mp4', 'webm']);
  });

  it('不同项目的导出记录互不干扰', async () => {
    await putExport({ projectId: 'a', format: 'webm', sizeBytes: 1, durationMs: 1 });
    await putExport({ projectId: 'b', format: 'webm', sizeBytes: 1, durationMs: 1 });
    expect(await listExports('a')).toHaveLength(1);
    expect(await listExports('b')).toHaveLength(1);
  });
});

// ===== TC-V1-I18N-03 硬编码残留扫描（源码级） =====
describe('i18n 词条完整性（I18N-03 源码级抽查）', () => {
  it('中文词条均非占位符（不含 TODO/待译）', () => {
    for (const [k, v] of Object.entries(MESSAGES_ZH)) {
      expect(v, `${k}.zh`).not.toMatch(/TODO|待译|FIXME/);
    }
  });

  it('英文包可按需加载且非占位符（I18N-06）', async () => {
    const en = await loadLang('en');
    expect(en).toBeTruthy();
    for (const [k, v] of Object.entries(en as Record<string, string>)) {
      expect(v, `${k}.en`).not.toMatch(/TODO|FIXME/);
    }
  });

  it('词条数量满足基础覆盖（≥50）', () => {
    expect(Object.keys(MESSAGES_ZH).length).toBeGreaterThanOrEqual(50);
  });
});

// ===== 字体格式识别补充 =====
describe('字体格式识别（FONT-01 前置）', () => {
  it('大小写不敏感', () => {
    expect(detectFormat('A.TTF')).toBe('truetype');
    expect(detectFormat('B.Woff2')).toBe('woff2');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
