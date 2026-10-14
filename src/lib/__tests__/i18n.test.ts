// V1-C2 N2.1/N2.2 测试：i18n 骨架与主题/语言设置
import { describe, it, expect, beforeAll } from 'vitest';
import { MESSAGES_ZH, translate, loadLang, getMessages } from '@/lib/i18n';
import { PRESET_TEMPLATES } from '@/lib/presets';
import { FONT_CATALOG, getFontMeta } from '@/lib/fonts';

// 英文包为按需加载，测试中先显式加载再断言双语完整性
beforeAll(async () => {
  await loadLang('en');
});

describe('i18n 骨架（N2.2）', () => {
  it('中文主包每个词条都非空', () => {
    for (const [key, zh] of Object.entries(MESSAGES_ZH)) {
      expect(zh, `${key} 缺 zh`).toBeTruthy();
    }
  });

  it('英文包键名与中文包一致（无缺漏）', () => {
    const merged = getMessages();
    for (const [key, entry] of Object.entries(merged)) {
      expect(entry.zh, `${key} 缺 zh`).toBeTruthy();
      expect(entry.en, `${key} 缺 en`).toBeTruthy();
    }
  });

  it('translate 按语言返回对应文案', () => {
    expect(translate('nav.home', 'zh')).toBe('首页');
    expect(translate('nav.home', 'en')).toBe('Home');
  });

  it('未登记键回退为键名（开发期可见）', () => {
    expect(translate('nonexistent.key', 'zh')).toBe('nonexistent.key');
  });

  it('核心导航与新页面文案均已登记', () => {
    const required = [
      'nav.home',
      'nav.help',
      'help.title',
      'help.seal',
      'settings.theme',
      'settings.language',
      'seal.outOfRangeHint',
      'editor.preview',
    ];
    for (const k of required) {
      expect(MESSAGES_ZH[k], `缺词条 ${k}`).toBeDefined();
    }
  });
});

describe('主题与语言设置（N2.1）', () => {
  it('字体目录含小篆且可用，family 值为 seal', () => {
    const seal = getFontMeta('seal');
    expect(seal.family).toBe('seal');
    expect(seal.available).toBe(true);
    expect(seal.path).toBe('seal-restricted');
  });

  it('字体目录三路径齐全（楷/宋/小篆）', () => {
    const fams = FONT_CATALOG.map((f) => f.family);
    expect(fams).toEqual(['kai', 'song', 'seal']);
  });
});

describe('模板库（N2.3）', () => {
  it('模板集含小篆模板且字体值为 seal', () => {
    const sealTpl = PRESET_TEMPLATES.find((t) => t.options.fontFamily === 'seal');
    expect(sealTpl).toBeDefined();
    expect(sealTpl?.text.length).toBeGreaterThan(10);
  });

  it('每个模板都有标题、正文与封面', () => {
    for (const t of PRESET_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.text).toBeTruthy();
      expect(t.cover).toBeTruthy();
    }
  });

  it('模板字体值均在合法范围内', () => {
    for (const t of PRESET_TEMPLATES) {
      expect(['kai', 'song', 'seal']).toContain(t.options.fontFamily);
    }
  });
});
