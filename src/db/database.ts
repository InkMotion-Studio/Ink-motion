import Dexie, { type Table } from 'dexie';
import type {
  Project,
  FontRecord,
  ExportRecord,
  SettingRecord,
  ProjectOptions,
  CustomStrokeRecord,
} from './types';
import { DEFAULT_OPTIONS } from './types';

// 索引设计（IM-DB-001 §4）：projects 以 updatedAt 降序检索"最近项目"；
// fonts 以 family+source 检索；exports 以 projectId 检索；settings 主键 key。
class InkMotionDB extends Dexie {
  projects!: Table<Project, string>;
  fonts!: Table<FontRecord, string>;
  exports!: Table<ExportRecord, string>;
  settings!: Table<SettingRecord, string>;
  customstrokes!: Table<CustomStrokeRecord, string>;

  constructor() {
    super('inkmotion');
    this.version(1).stores({
      projects: 'id, updatedAt, createdAt', // DC-06 字数上限在写入前校验，不在索引层
      fonts: 'id, family, source, name',
      exports: 'id, projectId, createdAt',
      settings: 'key',
    });
    // V2-C7 C4：用户定制兜底层（C 层）。新增表，不改动既有表（Dexie 增量升级）。
    this.version(2).stores({
      customstrokes: 'id, char, updatedAt',
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

/** V1-C3 N3.2：删除上传字体（仅 fonts 表记录；dataURL 随记录一并移除） */
export async function deleteFont(id: string): Promise<void> {
  await db.fonts.delete(id);
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

// ===== V2-C7 C4：用户定制兜底层（C 层）=====
const ORDER_ALPHABET = /^[a-z]+$/; // 26 字母笔顺编码

/** 校验笔顺编码串：仅允许小写字母（26 字母编码），长度 1–64 */
export function isValidOrder(order: string): boolean {
  return ORDER_ALPHABET.test(order) && order.length > 0 && order.length <= 64;
}

/**
 * 写入/覆盖某字的用户定制（C 层）。id 固定为字符本身（一字一条，重复写即覆盖）。
 * @throws 当 order 非法（非 26 字母编码）时抛错
 */
export async function putCustomStroke(input: {
  char: string;
  order?: string;
  outline?: CustomStrokeRecord['outline'];
  note?: string;
}): Promise<CustomStrokeRecord> {
  const char = input.char.trim();
  if (char.length !== 1) throw new Error('定制字符须为单个字符');
  if (input.order !== undefined && !isValidOrder(input.order)) {
    throw new Error('笔顺编码非法（应为 26 字母小写序列）');
  }
  const now = Date.now();
  const existing = await db.customstrokes.get(char);
  const record: CustomStrokeRecord = {
    id: char,
    char,
    order: input.order ?? existing?.order,
    outline: input.outline ?? existing?.outline,
    note: input.note ?? existing?.note,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.customstrokes.put(record);
  return record;
}

export async function getCustomStroke(char: string): Promise<CustomStrokeRecord | undefined> {
  return db.customstrokes.get(char);
}

export async function listCustomStrokes(): Promise<CustomStrokeRecord[]> {
  return db.customstrokes.orderBy('updatedAt').reverse().toArray();
}

export async function deleteCustomStroke(char: string): Promise<void> {
  await db.customstrokes.delete(char);
}

/** 导出全部用户定制（C 层）为可移植 JSON（版本化，供备份/分享）。 */
export async function exportCustomStrokes(): Promise<string> {
  const records = await db.customstrokes.toArray();
  return JSON.stringify(
    { type: 'inkmotion-customstrokes', version: 1, exportedAt: Date.now(), records },
    null,
    2,
  );
}

/**
 * 导入用户定制（C 层）JSON，逐条校验后合并写入（同字覆盖）。
 * @returns { imported, skipped } 导入与跳过的条数（非法条目跳过，不中断）
 */
export async function importCustomStrokes(json: string): Promise<{ imported: number; skipped: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSON 解析失败');
  }
  const records = (parsed as { records?: unknown[] })?.records;
  if (!Array.isArray(records)) throw new Error('缺少 records 数组');
  let imported = 0;
  let skipped = 0;
  const now = Date.now();
  for (const raw of records) {
    const r = raw as Partial<CustomStrokeRecord>;
    if (typeof r?.char !== 'string' || r.char.trim().length !== 1) {
      skipped++;
      continue;
    }
    if (r.order !== undefined && (typeof r.order !== 'string' || !isValidOrder(r.order))) {
      skipped++;
      continue;
    }
    await db.customstrokes.put({
      id: r.char,
      char: r.char,
      order: r.order,
      outline: r.outline,
      note: r.note,
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : now,
      updatedAt: now,
    });
    imported++;
  }
  return { imported, skipped };
}

export { TEXT_HARD_LIMIT, uuid };
