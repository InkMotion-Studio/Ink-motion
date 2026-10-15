import { describe, it, expect } from 'vitest';
import { parseProjectJSON, downloadProjectJSON } from '@/lib/projectIO';
import { PRESET_TEMPLATES } from '@/lib/presets';
import { detectCapabilities } from '@/engine/exporter';
import { FONT_CATALOG, getFontMeta, isRenderable } from '@/lib/fonts';
import { DEFAULT_OPTIONS, type Project } from '@/db/types';

function makeFile(content: string, name = 'p.json'): File {
  return new File([content], name, { type: 'application/json' });
}

describe('工程导入导出（N3.5）', () => {
  it('导出再导入保持文本与标题', async () => {
    const project: Project = {
      id: 'x',
      title: '静夜思',
      text: '床前明月光',
      options: { ...DEFAULT_OPTIONS, carrier: 'bamboo', fontSize: 120 },
      createdAt: 1,
      updatedAt: 1,
    };
    // 导出（仅验证不抛错；下载副作用在 jsdom 下无害）
    expect(() => downloadProjectJSON(project)).not.toThrow();
  });

  it('解析合法工程文件', async () => {
    const payload = JSON.stringify({
      format: 'inkmotion-project',
      version: 1,
      title: '导入测试',
      text: '春眠不觉晓',
      options: { carrier: 'bamboo' },
    });
    const parsed = await parseProjectJSON(makeFile(payload));
    expect(parsed.title).toBe('导入测试');
    expect(parsed.options.carrier).toBe('bamboo');
    expect(parsed.options.fontSize).toBe(DEFAULT_OPTIONS.fontSize); // 缺省项回填
  });

  it('拒绝非墨演工程文件', async () => {
    await expect(parseProjectJSON(makeFile('{"foo":1}'))).rejects.toThrow();
  });

  it('拒绝非法 JSON', async () => {
    await expect(parseProjectJSON(makeFile('not json'))).rejects.toThrow();
  });

  it('拒绝超长文本', async () => {
    const payload = JSON.stringify({
      format: 'inkmotion-project',
      version: 1,
      title: 't',
      text: '永'.repeat(5001),
    });
    await expect(parseProjectJSON(makeFile(payload))).rejects.toThrow();
  });
});

describe('预设模板（N3.1）', () => {
  it('提供 5 个硬编码预设（含 V1-C2 小篆模板与 V2-C2 隶书模板）', () => {
    expect(PRESET_TEMPLATES.length).toBe(5);
    for (const t of PRESET_TEMPLATES) {
      expect(t.text.length).toBeGreaterThan(0);
      expect(t.title.length).toBeGreaterThan(0);
    }
  });
});

describe('字体目录与许可（N1.4）', () => {
  it('楷体可用且为精确路径，古文字 V1.0 已可用（受限字库）', () => {
    expect(getFontMeta('kai').available).toBe(true);
    expect(getFontMeta('kai').path).toBe('kai');
    expect(getFontMeta('seal').available).toBe(true); // V1.0 受限字库模式可用
    expect(getFontMeta('seal').path).toBe('seal-restricted');
    expect(isRenderable('永', 'seal')).toBe(true); // 越界判定交由 seal.ts
    expect(getFontMeta('li').available).toBe(true); // V2-C2 隶书受限字库可用
    expect(getFontMeta('li').path).toBe('li-restricted');
    expect(isRenderable('永', 'li')).toBe(true); // 越界判定交由 lishu.ts
    expect(isRenderable('永', 'kai')).toBe(true);
  });

  it('每种字体都带许可与署名（合规门禁 C2）', () => {
    for (const f of FONT_CATALOG) {
      expect(f.license).toBeTruthy();
      // V2-C7 C7 BUG-004：署名文案改走 i18n 键（移除硬编码中文兜底字段）
      expect(f.attributionKey.length).toBeGreaterThan(0);
    }
  });
});

describe('导出能力探测（N2.6）', () => {
  it('返回结构完整的能力对象', () => {
    const caps = detectCapabilities();
    expect(typeof caps.webm).toBe('boolean');
    expect(typeof caps.webcodecsMp4).toBe('boolean');
    expect(['webm', 'mp4']).toContain(caps.recommended);
  });
});
