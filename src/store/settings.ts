import { create } from 'zustand';
import { getSetting, setSetting, listFonts } from '@/db/database';
import type { FontRecord } from '@/db/types';
import type { SealLayerSetting } from '@/lib/seal';
import { restoreFonts } from '@/lib/fontRegistry';

export type ThemeMode = 'light' | 'dark'; // MVP 仅 light 实际启用（V1.0 dark）
export type Language = 'zh' | 'en'; // MVP 仅 zh（V1.0 en）

interface SettingsState {
  theme: ThemeMode;
  language: Language;
  reduceMotion: boolean;
  defaultCarrier: 'paper' | 'bamboo';
  sealLayers: SealLayerSetting; // V2-C1 N1.4：篆书字源层级（仅 L0 / L0+L1 / 全量）
  fonts: FontRecord[];
  ready: boolean;
  init: () => Promise<void>;
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: Language) => void;
  setReduceMotion: (v: boolean) => void;
  setDefaultCarrier: (c: 'paper' | 'bamboo') => void;
  setSealLayers: (s: SealLayerSetting) => void;
  refreshFonts: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'light',
  language: 'zh',
  reduceMotion: false,
  defaultCarrier: 'paper',
  sealLayers: 'L0',
  fonts: [],
  ready: false,
  init: async () => {
    const [theme, lang, reduce, carrier, sealLayers] = await Promise.all([
      getSetting<ThemeMode>('theme', 'light'),
      getSetting<Language>('language', 'zh'),
      getSetting<boolean>('reduceMotion', false),
      getSetting<'paper' | 'bamboo'>('defaultCarrier', 'paper'),
      getSetting<SealLayerSetting>('sealLayers', 'L0'),
    ]);
    set({ theme, language: lang, reduceMotion: reduce, defaultCarrier: carrier, sealLayers, ready: true });
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
  setSealLayers: (s) => {
    set({ sealLayers: s });
    setSetting('sealLayers', s);
  },
  refreshFonts: async () => {
    const fonts = await listFonts();
    set({ fonts });
    // V2-C4 N4.1：修复"刷新后上传字体失效"——每次拉取列表后同步重注册 FontFace。
    // 幂等（registerFontRecord 内部去重），已注册的字体不会重复加载。
    await restoreFonts(fonts);
  },
}));
