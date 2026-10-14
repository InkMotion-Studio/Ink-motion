import type { ProjectOptions } from '@/db/types';

export interface PresetTemplate {
  id: string;
  title: string;
  text: string;
  options: Partial<ProjectOptions>;
  cover: string; // 描述性封面文字（占位，真实缩略图由引擎生成，C2）
}

// MVP 首页"快速开始"三个硬编码预设（IM-UI-001 §6.1）
export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'preset-jingyesi',
    title: '静夜思 · 宣纸楷体',
    text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
    options: { carrier: 'paper', fontFamily: 'kai' },
    cover: '宣纸 · 楷',
  },
  {
    id: 'preset-chunxiao',
    title: '春晓 · 竹简宋体',
    text: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。',
    options: { carrier: 'bamboo', fontFamily: 'song' },
    cover: '竹简 · 宋',
  },
  {
    id: 'preset-guanquelou',
    title: '登鹳雀楼 · 宣纸楷体',
    text: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。',
    options: { carrier: 'paper', fontFamily: 'kai' },
    cover: '宣纸 · 楷',
  },
  // V1-C1：新增小篆受限字库模板（覆盖字库内的《静夜思》字符）
  {
    id: 'preset-jingyesi-seal',
    title: '静夜思 · 宣纸小篆',
    text: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
    options: { carrier: 'paper', fontFamily: 'seal' },
    cover: '宣纸 · 篆',
  },
];
