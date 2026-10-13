// 工程文件导入 / 导出（纯本地，JSON）。便于用户备份与迁移，不经服务端。
import type { Project, ProjectOptions } from '@/db/types';
import { DEFAULT_OPTIONS } from '@/db/types';

export interface ProjectJSON {
  format: 'inkmotion-project';
  version: 1;
  title: string;
  text: string;
  options: ProjectOptions;
}

const TEXT_HARD_LIMIT = 5000;

export function downloadProjectJSON(project: Project): void {
  const payload: ProjectJSON = {
    format: 'inkmotion-project',
    version: 1,
    title: project.title,
    text: project.text,
    options: project.options,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inkmotion-${project.title || '作品'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseProjectJSON(file: File): Promise<ProjectJSON> {
  const raw = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('文件不是合法 JSON');
  }
  const obj = data as Partial<ProjectJSON>;
  if (obj.format !== 'inkmotion-project') throw new Error('不是墨演工程文件');
  const text = typeof obj.text === 'string' ? obj.text : '';
  if (text.length > TEXT_HARD_LIMIT) throw new Error(`文本超过 ${TEXT_HARD_LIMIT} 字上限`);
  return {
    format: 'inkmotion-project',
    version: 1,
    title: typeof obj.title === 'string' && obj.title.trim() ? obj.title : '导入作品',
    text,
    options: { ...DEFAULT_OPTIONS, ...(obj.options ?? {}) },
  };
}
