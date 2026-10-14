// V1-C1 N1.1 + N1.2：小篆字库加载管线 与 今字↔篆字映射
// 设计决策 D-V1-01：古文字路径 = 受限字库 + 真实字形映射（整数显现，不承诺笔顺）。
// 数据真源：霞鹜篆书 LXGW Seal（OFL 1.1）的 documentation/table.md 映射表（见 public/fonts/seal/seal-map.json）。
// 渲染：通过 FontFace 注册子集化 woff2，按 Unicode 18.0 小篆码位（U+3D000+）直接 fillText 取字形。

import { assetUrl } from '@/lib/assets';

export const SEAL_FONT_FAMILY = 'LXGW Seal';
// V1-C5 N5.1：资产 URL 统一由 lib/assets.ts 资产清单提供（v2 命名空间 / CDN 可切换）
export const SEAL_FONT_URL = assetUrl('seal-font'); // 子集化 woff2（主用）
export const SEAL_MAP_URL = assetUrl('seal-map');
export const SEAL_OFL_URL = assetUrl('seal-license'); // OFL.txt 随包发布（许可合规 V1-C2）
export const SEAL_FALLBACK_URL = assetUrl('seal-font-fallback'); // 完整 TTF（按需回退）
export const SEAL_LICENSE = 'OFL' as const;
export const SEAL_LICENSE_URL = 'https://scripts.sil.org/OFL';
export const SEAL_ATTRIBUTION =
  '小篆字形基于《霞鹜篆书》LXGW Seal（SIL 开放字体许可 OFL 1.1），兼容 Unicode 18.0 小篆区块。';

/** 一个篆字条目：一个小篆码位（render 用）对应若干今字（输入用）。 */
export interface SealGlyph {
  codePoint: number; // 小篆码位，如 0x3D01E（福）
  modernChars: string[]; // 对应今字（本字/简化字/隶定字/异体），如 ['福']
  source: 'lxgw'; // 字源标识（分层字库预留：lxgw / jfzs / tw-kai-seal）
}

/** 受限字表：V1.0 古文字路径的可渲染全集（不覆盖任意文本）。 */
export interface SealCharset {
  version: string; // 字表版本，如 'seal-2026.10-165'
  glyphs: SealGlyph[];
  modernIndex: Record<string, number>; // 今字(单字符) → 小篆码位，O(1) 查询
}

let charsetPromise: Promise<SealCharset> | null = null;
let cachedCharset: SealCharset | null = null;
let fontRegistered = false;

/** 加载字表 JSON（构建期生成自官方 table.md，静态资源）。 */
export async function loadSealCharset(): Promise<SealCharset> {
  if (charsetPromise) return charsetPromise;
  charsetPromise = (async () => {
    const res = await fetch(SEAL_MAP_URL);
    if (!res.ok) throw new Error(`小篆字表加载失败：${res.status}`);
    const raw = (await res.json()) as { version: string; rows: Array<Record<string, unknown>> };
    const glyphs: SealGlyph[] = [];
    const modernIndex: Record<string, number> = {};
    for (const row of raw.rows) {
      const seal = row.seal as number;
      // 收集今字：本字(ben_ch) + 简化字(jian_ch) + 隶定字(li_ch) + 异体(other_ch)
      const mods: string[] = [];
      for (const key of ['ben_ch', 'jian_ch', 'li_ch', 'other_ch'] as const) {
        const arr = (row[key] as string[] | undefined) ?? [];
        for (const ch of arr) if (ch) mods.push(ch);
      }
      glyphs.push({ codePoint: seal, modernChars: mods, source: 'lxgw' });
      for (const ch of mods) {
        // 冲突时保留首个（字表已尽量唯一；特殊字如 歷/历 有文档说明）
        if (!(ch in modernIndex)) modernIndex[ch] = seal;
      }
    }
    const cs: SealCharset = { version: raw.version ?? 'seal-unknown', glyphs, modernIndex };
    cachedCharset = cs;
    return cs;
  })();
  return charsetPromise;
}

/** 同步获取已加载的字表；未加载时返回 null（调用方需先 await loadSealCharset）。 */
export function loadSealCharsetSync(): SealCharset | null {
  return cachedCharset;
}

/**
 * 注册小篆字体（FontFace）。纯本地：从同源静态资源 / 版本化 CDN 加载，不上传任何数据。
 * 优先使用 42KB 子集 woff2；失败时回退完整 TTF（N5.1 资产清单登记）。
 * 调用方负责在渲染前 await 此函数（或 checkSealReady）。
 */
export type SealFontSource = 'subset' | 'fallback' | 'none';
let sealFontSource: SealFontSource = 'none';

export async function registerSealFont(): Promise<void> {
  if (fontRegistered) return;
  if (typeof document === 'undefined' || !('fonts' in document)) return; // SSR/jsdom 守卫
  const candidates: Array<[string, SealFontSource]> = [
    [SEAL_FONT_URL, 'subset'],
    [SEAL_FALLBACK_URL, 'fallback'],
  ];
  for (const [url, src] of candidates) {
    try {
      const face = new FontFace(SEAL_FONT_FAMILY, `url(${url})`);
      await face.load();
      (document as Document & { fonts: FontFaceSet }).fonts.add(face);
      fontRegistered = true;
      sealFontSource = src;
      return;
    } catch {
      // 尝试下一个候选（子集缺失 → 完整 TTF；仍失败 → 渲染层降级）
    }
  }
  fontRegistered = false;
  sealFontSource = 'none';
}

/** 当前生效的小篆字体来源（诊断用）。 */
export function getSealFontSource(): SealFontSource {
  return sealFontSource;
}

export function isSealFontReady(): boolean {
  return fontRegistered;
}

/**
 * 今字 → 小篆码位（支持常用字/简化字/异体自动映射）。
 * 返回 null 表示该字不在受限字表内（越界，应跳过并提示）。
 */
export function modernToSeal(ch: string, charset: SealCharset): number | null {
  return charset.modernIndex[ch] ?? null;
}

/**
 * 将一段含今字的文本转换为渲染用字符序列：
 * - 在字表内 → 替换为对应小篆码位字符（如 '福' → '\u{3D01E}'）
 * - 不在字表内 → 标记越界，返回原字符（调用方跳过并提示）
 * 标点等保留原字符（字体子集已含常用标点）。
 */
export interface SealTransformResult {
  renderChars: string[]; // 每个输入字符对应的渲染字符（越界位为原字符）
  outOfRange: string[]; // 越界字符集合（去重）
}

export function transformToSeal(text: string, charset: SealCharset): SealTransformResult {
  const outOfRangeSet = new Set<string>();
  const renderChars: string[] = [];
  for (const ch of Array.from(text)) {
    if (ch.trim().length === 0) {
      renderChars.push(ch);
      continue;
    }
    const seal = modernToSeal(ch, charset);
    if (seal == null) {
      outOfRangeSet.add(ch);
      renderChars.push(ch); // 越界：保留原字符，交由渲染层/UI 跳过
    } else {
      renderChars.push(String.fromCodePoint(seal));
    }
  }
  return { renderChars, outOfRange: Array.from(outOfRangeSet) };
}

/** 古文字路径可用性：字表与字体均就绪才视为可用（GV-01/GV-02）。 */
export async function ensureSealReady(): Promise<boolean> {
  try {
    await registerSealFont();
    await loadSealCharset();
    return isSealFontReady() && (await loadSealCharset()).glyphs.length > 0;
  } catch {
    return false;
  }
}
