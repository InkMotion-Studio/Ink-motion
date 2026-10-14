// 字体目录与许可元数据（N1.4 / IM-API-001 §5.1 / IM-UI-001 §6.5.1）
// 楷体=Arphic UKai（Arphic Public License，须可见署名）；
// 宋体=Source Han Serif（OFL）；
// 古文字=小篆（霞鹜篆书 LXGW Seal，OFL 1.1，受限字库模式，见 IM-GLYPH-001 / D-V1-01）。

import type { FontFamily } from '@/db/types';

export interface FontMeta {
  family: FontFamily;
  label: string;
  /** 渲染路径：kai=hanzi-writer 精确；song=整字显现；seal=受限字库整字显现（不承诺笔顺） */
  path: 'hanzi-writer' | 'whole' | 'seal-restricted';
  license: 'ArphicPL' | 'OFL' | 'System';
  licenseUrl: string;
  attribution: string;
  available: boolean; // false = 阻塞 / 未就绪
  note?: string;
}

export const FONT_CATALOG: FontMeta[] = [
  {
    family: 'kai',
    label: '楷体（文鼎 UKai）',
    path: 'hanzi-writer',
    license: 'ArphicPL',
    licenseUrl: 'https://www.arphic.com.tw/',
    attribution: '楷体字形基于文鼎公众授权（Arphic Public License）的 UKai 字库。',
    available: true,
  },
  {
    family: 'song',
    label: '宋体（思源宋体）',
    path: 'whole',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attribution: '宋体字形基于思源宋体（Source Han Serif），采用 SIL 开放字体许可（OFL）。',
    available: true,
  },
  {
    family: 'seal',
    label: '小篆（霞鹜篆书）',
    path: 'seal-restricted',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attribution:
      '小篆字形基于《霞鹜篆书》LXGW Seal（SIL 开放字体许可 OFL 1.1），兼容 Unicode 18.0 小篆区块；采用受限字库模式，仅覆盖已收录篆字，其余字符自动跳过并提示。',
    available: true,
    note: '受限字库（V1.0 约 165/238 字）；不提供逐笔书写，仅整字显现。',
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
  if (family === 'seal') return true; // 越界判定交由 seal.ts，不走此处拦截
  return true;
}
