// V1-C2 N2.2 i18n 骨架 / V1-C4 N4.3 按需加载
// 主语言 zh-CN（静态打包），次语言 en（动态按需加载，首屏不含英文包 → TC-V1-I18N-06）。
// 设计原则：UI 文案经 t() 抽取；业务内容（用户文本/模板正文）不翻译。

import { MESSAGES_ZH } from './i18n.zh';

export type Lang = 'zh' | 'en';

/** 中文主包（首屏即用） */
export { MESSAGES_ZH };

/** 已加载的英文包（null = 尚未加载） */
let enPack: Record<string, string> | null = null;
let enLoading: Promise<Record<string, string>> | null = null;

/**
 * 按需加载语言包（仅 en 需要；zh 已静态内置）。
 * 幂等：重复调用返回同一 Promise，已加载则直接返回。
 */
export function loadLang(lang: Lang): Promise<Record<string, string> | null> {
  if (lang === 'zh') return Promise.resolve(MESSAGES_ZH);
  if (enPack) return Promise.resolve(enPack);
  if (!enLoading) {
    enLoading = import('./i18n.en')
      .then((m) => {
        enPack = m.MESSAGES_EN;
        return enPack;
      })
      .finally(() => {
        // 失败时允许重试
        if (!enPack) enLoading = null;
      });
  }
  return enLoading;
}

/** 英文包是否已加载（供 UI 判断是否显示"加载中"） */
export function isLangLoaded(lang: Lang): boolean {
  return lang === 'zh' || enPack !== null;
}

/**
 * 合并视图：{ key: { zh, en } }。
 * 英文未加载时 en 为空串（仅用于开发期检查与测试；运行时请用 translate）。
 */
export function getMessages(): Record<string, { zh: string; en: string }> {
  const out: Record<string, { zh: string; en: string }> = {};
  for (const [k, zh] of Object.entries(MESSAGES_ZH)) {
    out[k] = { zh, en: enPack?.[k] ?? '' };
  }
  return out;
}

/** 旧接口兼容：完整词典视图（英文按需填充） */
export const MESSAGES = getMessages();

export function translate(key: string, lang: Lang): string {
  const zh = MESSAGES_ZH[key];
  if (zh === undefined) return key; // 未登记键回退为键名（开发期可见）
  if (lang === 'zh') return zh;
  return enPack?.[key] || zh; // 英文未加载/缺失时回退中文
}
