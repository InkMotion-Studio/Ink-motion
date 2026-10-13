import Dexie, { type Table } from 'dexie';
import type {
  Project,
  FontRecord,
  ExportRecord,
  SettingRecord,
  ProjectOptions,
} from './types';
import { DEFAULT_OPTIONS } from './types';

// 索引设计（IM-DB-001 §4）：projects 以 updatedAt 降序检索"最近项目"；
// fonts 以 family+source 检索；exports 以 projectId 检索；settings 主键 key。
class InkMotionDB extends Dexie {
  projects!: Table<Project, string>;
  fonts!: Table<FontRecord, string>;
  exports!: Table<ExportRecord, string>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('inkmotion');
    this.version(1).stores({
      projects: 'id, updatedAt, createdAt', // DC-06 字数上限在写入前校验，不在索引层
      fonts: 'id, family, source, name',
      exports: 'id, projectId, createdAt',
      settings: 'key',
    });
  }
}

export const db = new InkMotionDB();

const TEXT_HARD_LIMIT = 5000; // IM-SRS-001 §3.5 / IM-DB-001 DC-06

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ===== Projects =====
export async function createProject(input: {
  title?: string;
  text?: string;
  options?: Partial<ProjectOptions>;
}): Promise<Project> {
  const text = input.text ?? '';
  if (text.length > TEXT_HARD_LIMIT) {
    throw new Error(`文本超过 ${TEXT_HARD_LIMIT} 字硬上限`);
  }
  const now = Date.now();
  const project: Project = {
    id: uuid(),
    title: input.title?.trim() || '未命名作品',
    text,
    options: { ...(DEFAULT_OPTIONS as ProjectOptions), ...input.options },
    createdAt: now,
    updatedAt: now,
  };
  await db.projects.add(project);
  return project;
}

export async function listProjects(): Promise<Project[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<Project, 'id' | 'createdAt'>>,
): Promise<void> {
  if (patch.text && patch.text.length > TEXT_HARD_LIMIT) {
    throw new Error(`文本超过 ${TEXT_HARD_LIMIT} 字硬上限`);
  }
  await db.projects.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.exports, async () => {
    await db.projects.delete(id);
    await db.exports.where('projectId').equals(id).delete();
  });
}

// ===== Fonts =====
export async function listFonts(): Promise<FontRecord[]> {
  return db.fonts.toArray();
}

export async function putFont(font: Omit<FontRecord, 'id' | 'createdAt'> & { id?: string }) {
  const record: FontRecord = {
    id: font.id ?? uuid(),
    createdAt: Date.now(),
    ...font,
  };
  await db.fonts.put(record);
  return record;
}

// ===== Exports =====
export async function putExport(rec: Omit<ExportRecord, 'id' | 'createdAt'> & { id?: string }) {
  const record: ExportRecord = { id: rec.id ?? uuid(), createdAt: Date.now(), ...rec };
  await db.exports.put(record);
  return record;
}

export async function listExports(projectId: string): Promise<ExportRecord[]> {
  return db.exports.where('projectId').equals(projectId).reverse().sortBy('createdAt');
}

// ===== Settings =====
export async function getSetting<T = unknown>(key: string, fallback?: T): Promise<T | undefined> {
  const rec = await db.settings.get(key);
  return (rec?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: SettingRecord['value']): Promise<void> {
  await db.settings.put({ key, value });
}

export { TEXT_HARD_LIMIT, uuid };
