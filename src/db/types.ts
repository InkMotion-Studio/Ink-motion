// 数据模型类型（IM-DB-001 §4–§5）。纯前端：全部存于 IndexedDB，文本永不上传。

// V2-C4 N4.2：新增 brush（马善政毛笔楷）；v2 为 kai/song/seal/li，v3 追加 brush（向后兼容）
export type FontFamily = 'kai' | 'song' | 'brush' | 'seal' | 'li';
/**
 * V2-C7 C6：载体扩为 10 种中国真实传统形制（原仅 paper/bamboo）。
 * 保留 paper/bamboo 键名不变，既有项目数据向后兼容。
 */
export type CarrierType =
  | 'paper' // 宣纸卷轴
  | 'scroll' // 立轴
  | 'handscroll' // 手卷
  | 'silk' // 绢帛
  | 'letter' // 信笺
  | 'gold' // 洒金笺
  | 'bamboo' // 竹简
  | 'wood' // 木牍
  | 'rubbing' // 碑拓
  | 'fan'; // 团扇

/** 渲染与导出参数（编辑器参数面板的唯一真相来源） */
export interface ProjectOptions {
  fontFamily: FontFamily; // 字体路径（三路径之一）
  carrier: CarrierType; // 载体
  fontSize: number; // 单字像素尺寸
  strokeColor: string; // 墨色（默认墨黑）
  backgroundColor: string; // 背景/载体底色
  writingSpeed: number; // 书写速度（1=标准，越大越快）
  scrollEnabled: boolean; // 自动滚动
  framerate: number; // 导出帧率
  width: number; // 画布宽（竖屏默认 1080）
  height: number; // 画布高（竖屏默认 1920）
  /** V2-C2 N2.3：沿字形轮廓一次性描绘显现（仅 seal/li 受限字库路径生效）；默认关闭 */
  outlineAnimation?: boolean;
  /**
   * V2-C4 N4.1：自定义/上传字体记录 id（指向 IndexedDB `fonts` 表）。
   * 设置后，渲染走该字体的真实字形（整字显现），fontFamily 仅作为回退与分组依据。
   */
  customFontId?: string;
  // ===== V2-C7 C6：载体观感参数（全部可选，缺省沿用各载体默认） =====
  /** 色温 ∈ [-1,1]：-1 冷 / 0 中性 / 1 暖 */
  warmth?: number;
  /** 装裱边宽度比例 ∈ [0,0.15]（立轴/手卷/绢帛生效） */
  mountRatio?: number;
  /** 老化/做旧强度 ∈ [0,1] */
  aging?: number;
  /** 钤印预定位 */
  sealPos?: 'none' | 'tr' | 'br' | 'bl' | 'tl';
}

export const DEFAULT_OPTIONS: ProjectOptions = {
  fontFamily: 'kai',
  carrier: 'paper',
  fontSize: 96,
  strokeColor: '#1c1a17',
  backgroundColor: '#f4ecd8',
  writingSpeed: 1,
  scrollEnabled: true,
  framerate: 30,
  width: 1080,
  height: 1920,
  outlineAnimation: false,
};

export interface Project {
  id: string; // uuid
  title: string;
  text: string; // 用户输入文本（≤5000 字硬上限，见 IM-SRS-001 §3.5）
  options: ProjectOptions;
  thumbnail?: string; // dataURL 缩略图（可选）
  createdAt: number;
  updatedAt: number;
}

export type FontSource = 'system' | 'preset' | 'uploaded';
export type FontFormat = 'truetype' | 'opentype' | 'woff2';

export interface FontRecord {
  id: string;
  name: string;
  family: FontFamily;
  source: FontSource;
  format: FontFormat;
  license: string; // 许可标识（如 'ArphicPL' / 'OFL'）
  dataUrl?: string; // 字体二进制（uploaded/preset）base64；CDN 资源用 url
  url?: string; // CDN 资源地址（N0.4 命名空间 inkmotion-assets-v1）
  createdAt: number;
}

export type ExportFormat = 'webm' | 'mp4';

export interface ExportRecord {
  id: string;
  projectId: string;
  format: ExportFormat;
  sizeBytes: number;
  durationMs: number;
  createdAt: number;
  url?: string; // 导出文件 object URL / dataURL
}

// ===== V2-C7 C4：用户定制兜底层（C 层）=====
/**
 * 用户自定义笔顺/字形记录（覆盖 A+B 权威表与 C3 内置轮廓）。
 * C 层为最高优先级：命中则整字按其定制书写。
 */
export interface CustomStrokeRecord {
  id: string; // uuid（= 字符，便于按字覆盖；一字一条）
  char: string; // 被定制的字符（主键语义）
  /** 覆盖笔顺：26 字母编码串（如 "gesl"）；缺省表示沿用 A+B 权威表 */
  order?: string;
  /** 覆盖字形轮廓（可选，自定义 SVG/点集路径），缺省沿用 C3 内置轮廓 */
  outline?: CustomOutline;
  /** 备注（用户可写来源/说明） */
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/** 用户自定义字形轮廓（设计坐标，与 OutlineGlyph 同构的紧凑表达）。 */
export interface CustomOutline {
  contours: { points: number[] }[]; // 每轮廓 [x,y,on, x,y,on, ...]
  unitsPerEm: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export type SettingsValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[]
  | object;

export interface SettingRecord {
  key: string; // 主键
  value: SettingsValue;
}
