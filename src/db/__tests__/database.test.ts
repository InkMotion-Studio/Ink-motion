import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  putExport,
  listExports,
  setSetting,
  getSetting,
  TEXT_HARD_LIMIT,
  db,
} from '@/db/database';

beforeEach(async () => {
  await Promise.all([db.projects.clear(), db.exports.clear(), db.settings.clear()]);
});

describe('N1.3 存储层：项目 CRUD', () => {
  it('创建后可读取，默认标题与选项正确', async () => {
    const p = await createProject({ text: '床前明月光' });
    expect(p.title).toBe('未命名作品');
    expect(p.options.fontFamily).toBe('kai');
    const got = await getProject(p.id);
    expect(got?.text).toBe('床前明月光');
  });

  it('列表按更新时间倒序', async () => {
    const a = await createProject({ title: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createProject({ title: 'B' });
    const list = await listProjects();
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });

  it('更新会推进 updatedAt', async () => {
    const p = await createProject({ title: 'X' });
    const before = p.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    await updateProject(p.id, { title: 'Y' });
    const got = await getProject(p.id);
    expect(got?.title).toBe('Y');
    expect(got!.updatedAt).toBeGreaterThan(before);
  });

  it('超过 5000 字硬上限时拒绝创建与更新', async () => {
    const long = '永'.repeat(TEXT_HARD_LIMIT + 1);
    await expect(createProject({ text: long })).rejects.toThrow();
    const p = await createProject({ text: '短' });
    await expect(updateProject(p.id, { text: long })).rejects.toThrow();
  });

  it('删除项目会级联清除其导出记录', async () => {
    const p = await createProject({ title: '待删' });
    await putExport({ projectId: p.id, format: 'webm', sizeBytes: 100, durationMs: 1000 });
    expect((await listExports(p.id)).length).toBe(1);
    await deleteProject(p.id);
    expect(await getProject(p.id)).toBeUndefined();
    expect((await listExports(p.id)).length).toBe(0);
  });
});

describe('N1.3 存储层：设置', () => {
  it('读写设置并可取默认值', async () => {
    expect(await getSetting('theme', 'light')).toBe('light');
    await setSetting('theme', 'dark');
    expect(await getSetting('theme')).toBe('dark');
  });
});
