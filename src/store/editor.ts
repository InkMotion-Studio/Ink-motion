import { create } from 'zustand';
import {
  createProject,
  getProject,
  updateProject,
  db,
} from '@/db/database';
import type { Project, ProjectOptions } from '@/db/types';
import { DEFAULT_OPTIONS } from '@/db/types';

interface EditorState {
  project: Project | null;
  dirty: boolean;
  loading: boolean;
  init: (id: string) => Promise<void>;
  newBlank: () => Promise<void>;
  setTitle: (t: string) => void;
  setText: (t: string) => void;
  setOptions: (patch: Partial<ProjectOptions>) => void;
  save: () => Promise<void>;
  /** V2-C7 C7 BUG-002：立即落库（脱离 debounce），用于路由离开/页面隐藏兜底 */
  flush: () => Promise<void>;
  reset: () => void;
}

/**
 * V2-C7 C7 BUG-002 修复：编辑自动保存。
 * 此前 setText/setTitle/setOptions 只改内存、永不落库，用户编辑后直接返回即丢数据。
 * 现改为：每次编辑触发 debounce 写库（默认 800ms 空闲后落库），
 * 并暴露 flush() 供路由离开 / pagehide 时同步式兜底保存。
 */
const AUTOSAVE_DELAY_MS = 800;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

function cancelAutosave() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

function scheduleAutosave(save: () => Promise<void>) {
  cancelAutosave();
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    void save();
  }, AUTOSAVE_DELAY_MS);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  dirty: false,
  loading: false,

  init: async (id) => {
    cancelAutosave();
    set({ loading: true });
    const p = await getProject(id);
    set({ project: p ?? null, loading: false, dirty: false });
  },

  newBlank: async () => {
    cancelAutosave();
    const p = await createProject({ title: '未命名作品', text: '' });
    set({ project: p, dirty: true });
  },

  setTitle: (t) => {
    set((s) => (s.project ? { project: { ...s.project, title: t }, dirty: true } : {}));
    scheduleAutosave(() => get().save());
  },

  setText: (t) => {
    set((s) => (s.project ? { project: { ...s.project, text: t }, dirty: true } : {}));
    scheduleAutosave(() => get().save());
  },

  setOptions: (patch) => {
    set((s) =>
      s.project
        ? { project: { ...s.project, options: { ...s.project.options, ...patch } }, dirty: true }
        : {},
    );
    scheduleAutosave(() => get().save());
  },

  save: async () => {
    const { project } = get();
    if (!project) return;
    if (project.id && (await db.projects.get(project.id))) {
      await updateProject(project.id, {
        title: project.title,
        text: project.text,
        options: project.options,
      });
    } else {
      const created = await createProject({
        title: project.title,
        text: project.text,
        options: project.options,
      });
      // 落库后同步本地 id，避免后续每次都新建项目
      if (!project.id && created?.id) set({ project: { ...project, id: created.id } });
    }
    set({ dirty: false });
  },

  flush: async () => {
    cancelAutosave();
    await get().save();
  },

  reset: () => {
    cancelAutosave();
    set({ project: null, dirty: false, loading: false });
  },
}));

export { DEFAULT_OPTIONS };
