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
  label: string;
  /** i18n 键（V2-C3 N3.2）：UI 应优先用 labelKey 取本地化名称，label 仅作中文兜底/日志。 */
  labelKey: string;
  /** 渲染路径：kai=hanzi-writer 精确；song/brush=整字显现；seal/li=受限字库整字显现（不承诺笔顺） */
  path: 'hanzi-writer' | 'whole' | 'seal-restricted' | 'li-restricted';
  license: 'ArphicPL' | 'OFL' | 'System';
  licenseUrl: string;
  attribution: string;
  /** 署名 i18n 键（V2-C3 N3.2）。 */
  attributionKey: string;
  available: boolean; // false = 阻塞 / 未就绪
  /** 备注 i18n 键（V2-C3 N3.2），无备注时为 undefined。 */
  noteKey?: string;
  note?: string;
}

export const FONT_CATALOG: FontMeta[] = [
  {
    family: 'kai',
    label: '楷体（霞鹜文楷）',
    labelKey: 'options.font.kai',
    path: 'hanzi-writer',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attribution:
      '楷体字形基于《霞鹜文楷》LXGW WenKai（作者 LXGW，SIL 开放字体许可 OFL 1.1），随包提供分片字库。',
    attributionKey: 'font.attr.kai',
    available: true,
  },
  {
    family: 'song',
    label: '宋体（思源宋体）',
    labelKey: 'options.font.song',
    path: 'whole',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attribution:
      '宋体字形基于思源宋体（Source Han Serif / Noto Serif SC，Adobe 与 Google 合作，SIL 开放字体许可 OFL 1.1），随包提供分片字库。',
    attributionKey: 'font.attr.song',
    available: true,
  },
  {
    family: 'brush',
    label: '毛笔楷（马善政）',
    labelKey: 'options.font.brush',
    path: 'whole',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attribution:
      '毛笔楷字形基于马善政毛笔楷（Ma Shan Zheng，Google Fonts 项目，SIL 开放字体许可 OFL 1.1），覆盖 5959 字，适合标题与短句。',
    attributionKey: 'font.attr.brush',
    available: true,
    note: '书法风格字体，覆盖常用汉字；生僻字自动回退楷体。',
    noteKey: 'font.note.brush',
  },
  {
    family: 'seal',
    label: '小篆（霞鹜篆书）',
    labelKey: 'options.font.seal',
    path: 'seal-restricted',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attribution:
      '小篆字形基于《霞鹜篆书》LXGW Seal（SIL 开放字体许可 OFL 1.1），兼容 Unicode 18.0 小篆区块；采用受限字库模式，仅覆盖已收录篆字，其余字符自动跳过并提示。',
    attributionKey: 'font.attr.seal',
    available: true,
    note: '受限字库（V1.0 约 165/238 字）；不提供逐笔书写，仅整字显现。',
    noteKey: 'font.note.seal',
  },
  {
    family: 'li',
    label: '隶书（受限字库）',
    labelKey: 'options.font.li',
    path: 'li-restricted',
    license: 'System',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attribution:
      '隶书目前回退系统已装隶书字体（LiSu / STLiti / SimLi）。合规开源隶书字源（如阿里妈妈刀隶体）待登记获取，见 PENDING-LICENSES.md。',
    attributionKey: 'font.attr.li',
    available: true,
    // V2-C4 N4.3：如实标注——无内置隶书字源，依赖系统字体
    note: '当前依赖系统已安装的隶书字体；未安装时显示为普通衬线体。开源隶书字源待补充。',
    noteKey: 'font.note.li',
  },
];

export function getFontMeta(family: FontMeta['family']): FontMeta {
  return FONT_CATALOG.find((f) => f.family === family) ?? FONT_CATALOG[0];
}

// Hanzi Writer 笔画数据 CDN（Arphic UKai 笔顺数据由社区维护，按字按需加载）
export const HANZI_WRITER_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';

/**
 * 校验某字符是否可用当前字体路径渲染。
 * - kai/song：基础汉字与常用标点均可由对应路径呈现。
 * - seal：走受限字库逻辑，由 seal.ts 的 transformToSeal 判定越界（IM-TEST-001 §5.2）。
 */
export function isRenderable(_ch: string, family: FontMeta['family']): boolean {
  if (family === 'seal' || family === 'li') return true; // 越界判定交由 seal.ts / lishu.ts，不走此处拦截
  return true;
}
