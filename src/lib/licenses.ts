// V1-C5 N5.2：许可合规登记（IM-RISK-001 R-06 / IM-OPS-001 §8 / IM-UI-001 §6.5.1）
// 单一真源：关于页、致谢、发布检查单、THIRD-PARTY-NOTICES.md 均以此为准。
// 铁律：所有字体许可须在 UI 可见署名；随包分发的许可文件须登记 bundled 路径。

export type LicenseId =
  | 'Apache-2.0'
  | 'ArphicPL'
  | 'OFL-1.1'
  | 'OFL'
  | 'OpenGov-TW'
  | 'MIT'
  | 'ISC';

export interface LicenseEntry {
  /** 组件/字体名称（专有名词，不翻译） */
  name: string;
  /** 稳定标识（用于生成 i18n 键 license.<key>.usage） */
  key: string;
  /** 许可标识 */
  license: LicenseId;
  /** 许可全文链接 */
  url: string;
  /** 用途说明的 i18n 键（V2-C7 C7 BUG-004：改走字典，消除硬编码中文） */
  usageKey: string;
  /** 是否必须在 UI 可见署名 */
  attributionRequired: boolean;
  /** 随包分发的许可文件（站点相对路径），用于"许可文本随附"合规 */
  bundled?: string;
  /** 分类：字体 / 运行时依赖 / 构建期依赖 */
  category: 'font' | 'runtime' | 'build';
  /** V2-C1 N1.3 / D-V2-02：授权状态待确认，已采用并登记待后续联系获取授权 */
  pendingAuthorization?: boolean;
}

/** 应用自身许可（Apache-2.0）。 */
export const APP_LICENSE = {
  name: '墨演 InkMotion',
  license: 'Apache-2.0' as LicenseId,
  url: 'https://www.apache.org/licenses/LICENSE-2.0',
};

export const THIRD_PARTY_LICENSES: LicenseEntry[] = [
  {
    name: '文鼎楷体 UKai（Arphic UKai）',
    key: 'arphicUkai',
    license: 'ArphicPL',
    url: 'https://www.arphic.com.tw/',
    usageKey: 'license.arphicUkai.usage',
    attributionRequired: true,
    category: 'font',
  },
  {
    name: '霞鹜文楷 LXGW WenKai Lite',
    key: 'lxgwWenKai',
    license: 'OFL-1.1',
    url: 'https://github.com/lxgw/LxgwWenKai-Lite',
    usageKey: 'license.lxgwWenKai.usage',
    attributionRequired: true,
    bundled: '/fonts/builtin/fonts.css',
    category: 'font',
  },
  {
    name: '思源宋体 Noto Serif SC / Source Han Serif',
    key: 'sourceHanSerif',
    license: 'OFL-1.1',
    url: 'https://github.com/adobe-fonts/source-han-serif',
    usageKey: 'license.sourceHanSerif.usage',
    attributionRequired: true,
    bundled: '/fonts/builtin/fonts.css',
    category: 'font',
  },
  {
    name: '马善政毛笔楷 Ma Shan Zheng',
    key: 'maShanZheng',
    license: 'OFL-1.1',
    url: 'https://github.com/googlefonts/mashanzheng',
    usageKey: 'license.maShanZheng.usage',
    attributionRequired: true,
    bundled: '/fonts/builtin/fonts.css',
    category: 'font',
  },
  {
    name: '霞鹜篆书 LXGW Seal',
    key: 'lxgwSeal',
    license: 'OFL-1.1',
    url: 'https://scripts.sil.org/OFL',
    usageKey: 'license.lxgwSeal.usage',
    attributionRequired: true,
    bundled: '/fonts/seal/OFL.txt',
    category: 'font',
  },
  {
    name: '敬峰中山王篆（L1）',
    key: 'jingfengSeal',
    license: 'OFL',
    url: 'https://scripts.sil.org/OFL',
    usageKey: 'license.jingfengSeal.usage',
    attributionRequired: true,
    pendingAuthorization: true,
    category: 'font',
  },
  {
    name: '全字库说文解字（L2）',
    key: 'quanzikuShuowen',
    license: 'OpenGov-TW',
    url: 'https://data.gov.tw/',
    usageKey: 'license.quanzikuShuowen.usage',
    attributionRequired: true,
    pendingAuthorization: true,
    category: 'font',
  },
  {
    name: '阿里妈妈刀隶体（Alimama Dao Li Ti）',
    key: 'alimamaDaoLi',
    license: 'OFL',
    url: 'https://www.alimama.com/',
    usageKey: 'license.alimamaDaoLi.usage',
    attributionRequired: true,
    pendingAuthorization: true,
    category: 'font',
  },
  {
    name: 'cnchar（含 cnchar-order）',
    key: 'cnchar',
    license: 'MIT',
    url: 'https://github.com/cncharjs/cnchar',
    usageKey: 'license.cnchar.usage',
    attributionRequired: false,
    category: 'build',
  },
  // C2：原 Hanzi Writer（含 hanzi-writer-data，MIT）已移除——楷体笔顺改为本地权威内置，不再加载其 CDN 数据。
  {
    name: 'Dexie.js',
    key: 'dexie',
    license: 'Apache-2.0',
    url: 'https://dexie.org/',
    usageKey: 'license.dexie.usage',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'React / React DOM',
    key: 'react',
    license: 'MIT',
    url: 'https://react.dev/',
    usageKey: 'license.react.usage',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'Zustand',
    key: 'zustand',
    license: 'MIT',
    url: 'https://github.com/pmndrs/zustand',
    usageKey: 'license.zustand.usage',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'React Router',
    key: 'reactRouter',
    license: 'MIT',
    url: 'https://reactrouter.com/',
    usageKey: 'license.reactRouter.usage',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'mp4-muxer',
    key: 'mp4Muxer',
    license: 'MIT',
    url: 'https://github.com/Vanilagy/mp4-muxer',
    usageKey: 'license.mp4Muxer.usage',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'Vite / Vitest / TypeScript',
    key: 'viteToolchain',
    license: 'MIT',
    url: 'https://vitejs.dev/',
    usageKey: 'license.viteToolchain.usage',
    attributionRequired: false,
    category: 'build',
  },
];

/** 需要 UI 可见署名的条目（发布检查单 V1-C2 断言依据）。 */
export function attributionRequiredEntries(): LicenseEntry[] {
  return THIRD_PARTY_LICENSES.filter((l) => l.attributionRequired);
}

/** V2-C1 N1.3 / D-V2-02：授权状态待确认、已采用并登记待联系获取授权的条目。 */
export function pendingAuthorizationEntries(): LicenseEntry[] {
  return THIRD_PARTY_LICENSES.filter((l) => l.pendingAuthorization);
}

/** 随包分发的许可文件清单（发布检查单：许可文本随附）。 */
export function bundledLicenseFiles(): Array<{ name: string; path: string }> {
  return THIRD_PARTY_LICENSES.filter((l) => l.bundled).map((l) => ({
    name: l.name,
    path: l.bundled as string,
  }));
}
