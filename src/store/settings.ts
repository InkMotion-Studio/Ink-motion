import { create } from 'zustand';
import { getSetting, setSetting, listFonts } from '@/db/database';
import type { FontRecord } from '@/db/types';

export type ThemeMode = 'light' | 'dark'; // MVP 仅 light 实际启用（V1.0 dark）
export type Language = 'zh' | 'en'; // MVP 仅 zh（V1.0 en）

interface SettingsState {
  theme: ThemeMode;
  language: Language;
  reduceMotion: boolean;
  defaultCarrier: 'paper' | 'bamboo';
  fonts: FontRecord[];
  ready: boolean;
  init: () => Promise<void>;
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  setReduceMotion: (v: boolean) => void;
  setDefaultCarrier: (c: 'paper' | 'bamboo') => void;
  refreshFonts: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'light',
  language: 'zh',
  reduceMotion: false,
  defaultCarrier: 'paper',
  fonts: [],
  ready: false,
  init: async () => {
    const [theme, lang, reduce, carrier] = await Promise.all([
      getSetting<ThemeMode>('theme', 'light'),
      getSetting<Language>('language', 'zh'),
      getSetting<boolean>('reduceMotion', false),
      getSetting<'paper' | 'bamboo'>('defaultCarrier', 'paper'),
    ]);
    set({ theme, language: lang, reduceMotion: reduce, defaultCarrier: carrier, ready: true });
    await get().refreshFonts();
  },
  setTheme: (t) => {
    set({ theme: t });
    setSetting('theme', t);
  },
  setLanguage: (l) => {
    set({ language: l });
    setSetting('language', l);
  },
  setReduceMotion: (v) => {
    set({ reduceMotion: v });
    setSetting('reduceMotion', v);
  },
  setDefaultCarrier: (c) => {
    set({ defaultCarrier: c });
    setSetting('defaultCarrier', c);
  },
  refreshFonts: async () => {
    const fonts = await listFonts();
    set({ fonts });
  },
}));
