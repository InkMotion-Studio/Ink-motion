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
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  dirty: false,
  loading: false,

  init: async (id) => {
    set({ loading: true });
    const p = await getProject(id);
    set({ project: p ?? null, loading: false, dirty: false });
  },

  newBlank: async () => {
    const p = await createProject({ title: '未命名作品', text: '' });
    set({ project: p, dirty: true });
  },

  setTitle: (t) =>
    set((s) => (s.project ? { project: { ...s.project, title: t }, dirty: true } : {})),

  setText: (t) =>
    set((s) => (s.project ? { project: { ...s.project, text: t }, dirty: true } : {})),

  setOptions: (patch) =>
    set((s) =>
      s.project
        ? { project: { ...s.project, options: { ...s.project.options, ...patch } }, dirty: true }
        : {},
    ),

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
      await createProject({
        title: project.title,
        text: project.text,
        options: project.options,
      });
    }
    set({ dirty: false });
  },

  reset: () => set({ project: null, dirty: false, loading: false }),
}));

export { DEFAULT_OPTIONS };
