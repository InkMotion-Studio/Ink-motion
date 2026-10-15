// 字体目录与许可元数据（N1.4 / IM-API-001 §5.1 / IM-UI-001 §6.5.1）
//
// V2-C4 N4.2：内置字体改为**随包提供的开源字库**（OFL 1.1），不再依赖系统字体或外部 CDN。
//   · 楷体：霞鹜文楷 Lite（LXGW WenKai Lite）—— 25694 字形，全文覆盖
//   · 宋体：思源宋体（Noto Serif SC，Source Han Serif）—— 30928 字形，全文覆盖
//   · 毛笔：马善政毛笔楷（Ma Shan Zheng）—— 5959 字形，书法风格标题
//   · 小篆：霞鹜篆书（LXGW Seal）—— 受限字库，逐层扩展中
//   · 隶书：受限字库（真实字源待接入，见 PENDING-LICENSES.md；当前回退系统隶书族）
//
// 所有字体均按 unicode-range 分片（public/fonts/builtin/），浏览器按需下载，不占首屏。

import type { FontFamily } from '@/db/types';

export interface FontMeta {
  family: FontFamily;
  /** i18n 键（V2-C3 N3.2）：UI 用 labelKey 取本地化名称。V2-C7 C7：移除硬编码中文 label 兜底字段。 */
  labelKey: string;
  /** 渲染路径：kai=本地权威笔顺逐笔（C3 接字体轮廓）；song/brush=整字显现；seal/li=受限字库整字显现（不承诺笔顺） */
  path: 'kai' | 'whole' | 'seal-restricted' | 'li-restricted';
  license: 'ArphicPL' | 'OFL' | 'System';
  licenseUrl: string;
  /** 署名 i18n 键（V2-C3 N3.2）。 */
  attributionKey: string;
  available: boolean; // false = 阻塞 / 未就绪
  /** 备注 i18n 键（V2-C3 N3.2），无备注时为 undefined。 */
  noteKey?: string;
}

export const FONT_CATALOG: FontMeta[] = [
  {
    family: 'kai',
    labelKey: 'options.font.kai',
    path: 'kai',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attributionKey: 'font.attr.kai',
    available: true,
  },
  {
    family: 'song',
    labelKey: 'options.font.song',
    path: 'whole',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attributionKey: 'font.attr.song',
    available: true,
  },
  {
    family: 'brush',
    labelKey: 'options.font.brush',
    path: 'whole',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attributionKey: 'font.attr.brush',
    available: true,
    noteKey: 'font.note.brush',
  },
  {
    family: 'seal',
    labelKey: 'options.font.seal',
    path: 'seal-restricted',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attributionKey: 'font.attr.seal',
    available: true,
    noteKey: 'font.note.seal',
  },
  {
    family: 'li',
    labelKey: 'options.font.li',
    path: 'li-restricted',
    license: 'System',
    licenseUrl: 'https://scripts.sil.org/OFL',
    // V2-C4 N4.3：如实标注——无内置隶书字源，依赖系统字体
    attributionKey: 'font.attr.li',
    available: true,
    noteKey: 'font.note.li',
  },
];

export function getFontMeta(family: FontMeta['family']): FontMeta {
  return FONT_CATALOG.find((f) => f.family === family) ?? FONT_CATALOG[0];
}

// C2：楷体笔顺数据源已切换为本地权威内置（cnchar 导出，零网络），不再依赖任何外部 CDN。
// 故移除 HANZI_WRITER_CDN 常量。

/**
 * 校验某字符是否可用当前字体路径渲染。
 * - kai/song：基础汉字与常用标点均可由对应路径呈现。
 * - seal：走受限字库逻辑，由 seal.ts 的 transformToSeal 判定越界（IM-TEST-001 §5.2）。
 */
export function isRenderable(_ch: string, family: FontMeta['family']): boolean {
  if (family === 'seal' || family === 'li') return true; // 越界判定交由 seal.ts / lishu.ts，不走此处拦截
  return true;
}
