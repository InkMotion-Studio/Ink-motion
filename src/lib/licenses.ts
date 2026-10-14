// V1-C5 N5.2：许可合规登记（IM-RISK-001 R-06 / IM-OPS-001 §8 / IM-UI-001 §6.5.1）
// 单一真源：关于页、致谢、发布检查单、THIRD-PARTY-NOTICES.md 均以此为准。
// 铁律：所有字体许可须在 UI 可见署名；随包分发的许可文件须登记 bundled 路径。

export type LicenseId =
  | 'Apache-2.0'
  | 'ArphicPL'
  | 'OFL-1.1'
  | 'MIT'
  | 'ISC';

export interface LicenseEntry {
  /** 组件/字体名称（展示用） */
  name: string;
  /** 许可标识 */
  license: LicenseId;
  /** 许可全文链接 */
  url: string;
  /** 用途说明（一句话） */
  usage: string;
  /** 是否必须在 UI 可见署名 */
  attributionRequired: boolean;
  /** 随包分发的许可文件（站点相对路径），用于"许可文本随附"合规 */
  bundled?: string;
  /** 分类：字体 / 运行时依赖 / 构建期依赖 */
  category: 'font' | 'runtime' | 'build';
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
    license: 'ArphicPL',
    url: 'https://www.arphic.com.tw/',
    usage: '楷体路径字形与 Hanzi Writer 笔顺数据来源',
    attributionRequired: true,
    category: 'font',
  },
  {
    name: '思源宋体 Source Han Serif',
    license: 'OFL-1.1',
    url: 'https://scripts.sil.org/OFL',
    usage: '宋体路径字形（缺失时回退系统衬线）',
    attributionRequired: true,
    category: 'font',
  },
  {
    name: '霞鹜篆书 LXGW Seal',
    license: 'OFL-1.1',
    url: 'https://scripts.sil.org/OFL',
    usage: '小篆路径字形（受限字库，Unicode 18.0 小篆码位）',
    attributionRequired: true,
    bundled: '/fonts/seal/OFL.txt',
    category: 'font',
  },
  {
    name: 'Hanzi Writer（含 hanzi-writer-data）',
    license: 'MIT',
    url: 'https://github.com/chanind/hanzi-writer',
    usage: '楷体逐笔书写动画与笔顺数据加载',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'Dexie.js',
    license: 'Apache-2.0',
    url: 'https://dexie.org/',
    usage: 'IndexedDB 封装（项目/设置/字体本地持久化）',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'React / React DOM',
    license: 'MIT',
    url: 'https://react.dev/',
    usage: 'UI 框架',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'Zustand',
    license: 'MIT',
    url: 'https://github.com/pmndrs/zustand',
    usage: '轻量状态管理',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'React Router',
    license: 'MIT',
    url: 'https://reactrouter.com/',
    usage: '前端路由（HashRouter）',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'mp4-muxer',
    license: 'MIT',
    url: 'https://github.com/Vanilagy/mp4-muxer',
    usage: 'MP4 封装（WebCodecs 导出路径）',
    attributionRequired: false,
    category: 'runtime',
  },
  {
    name: 'Vite / Vitest / TypeScript',
    license: 'MIT',
    url: 'https://vitejs.dev/',
    usage: '构建与测试工具链（不随包分发）',
    attributionRequired: false,
    category: 'build',
  },
];

/** 需要 UI 可见署名的条目（发布检查单 V1-C2 断言依据）。 */
export function attributionRequiredEntries(): LicenseEntry[] {
  return THIRD_PARTY_LICENSES.filter((l) => l.attributionRequired);
}

/** 随包分发的许可文件清单（发布检查单：许可文本随附）。 */
export function bundledLicenseFiles(): Array<{ name: string; path: string }> {
  return THIRD_PARTY_LICENSES.filter((l) => l.bundled).map((l) => ({
    name: l.name,
    path: l.bundled as string,
  }));
}
