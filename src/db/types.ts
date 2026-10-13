// 数据模型类型（IM-DB-001 §4–§5）。纯前端：全部存于 IndexedDB，文本永不上传。

export type FontFamily = 'kai' | 'song' | 'ancient'; // 楷 / 宋 / 古文字（V1.0）
export type CarrierType = 'paper' | 'bamboo'; // 宣纸卷轴 / 竹简

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
export type FontFormat = 'truetype' | 'opentype' | 'woff2' | 'hanzi-writer-data';

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
