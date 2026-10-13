// 字体目录与许可元数据（N1.4 / IM-API-001 §5.1 / IM-UI-001 §6.5.1）
// 楷体=Arphic UKai（Arphic Public License，须可见署名）；
// 宋体=Source Han Serif（OFL）；
// 古文字=开源小篆（OFL，尚未发布 → 阻塞，见 IM-RISK-001 R-01）。

export interface FontMeta {
  family: 'kai' | 'song' | 'ancient';
  label: string;
  /** 渲染路径：kai=hanzi-writer 精确；song=整字显现；ancient=骨架化（V1.0 阻塞） */
  path: 'hanzi-writer' | 'whole' | 'skeleton';
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
    family: 'ancient',
    label: '小篆（开源小篆）',
    path: 'skeleton',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    attribution: '小篆字形计划采用开源小篆字库（OFL），发布前以骨架化模拟呈现。',
    available: false,
    note: '阻塞：开源小篆字库尚未发布（IM-RISK-001 R-01）。',
  },
];

export function getFontMeta(family: FontMeta['family']): FontMeta {
  return FONT_CATALOG.find((f) => f.family === family) ?? FONT_CATALOG[0];
}

// Hanzi Writer 笔画数据 CDN（Arphic UKai 笔顺数据由社区维护，按字按需加载）
export const HANZI_WRITER_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';

/** 校验某字符是否可用当前字体路径渲染；古文字未就绪时返回 false（越界跳过，IM-TEST-001 §5.2）。 */
export function isRenderable(_ch: string, family: FontMeta['family']): boolean {
  if (family === 'ancient') return false; // 阻塞
  // 基础汉字与常用标点均可由 kai/song 路径呈现
  return true;
}
