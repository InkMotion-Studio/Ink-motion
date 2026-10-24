// V2-C2 N2.2：隶书受限字库引擎（镜像 seal.ts 的单层简化版）
// 依 D-V2-02（用户决策 2026-10-14）：隶书字源「一律采用」；字体二进制/映射表若未随包提供，
// 加载器静默跳过并由系统隶书族 / 衬线兜底，不阻塞、不白屏（与 V2-C1 的 L1/L2 同构）。
//
// 与篆书（U+3D000+ 专有码位）不同，多数开源隶书直接以常用字编码，
// 故 transformToLi 采用「主路径恒等映射」：字表存在则按 modernIndex 精确判越界；
// 字表缺失则 renderChars === Array.from(text) 且 outOfRange 为空（不拦截）。
// 隶书同样只做整字显现，不承诺笔顺（与 IM-GLYPH-V2-001 §4.3 一致）。

import { assetUrl } from '@/lib/assets';

// ===== 常量 =====
export const LI_FONT_FAMILY = 'LXGW Li'; // 隶书注册字族名（资产缺失时静默跳过）
export const LI_FONT_URL = assetUrl('li-font'); // 子集化 woff2（主用）
export const LI_MAP_URL = assetUrl('li-map');
export const LI_FALLBACK_URL = assetUrl('li-font-fallback'); // 完整 TTF（按需回退）
export const LI_LICENSE = 'OFL' as const;
export const LI_LICENSE_URL = 'https://scripts.sil.org/OFL';
export const LI_ATTRIBUTION =
  '隶书字形基于隶书开放字源（SIL 开放字体许可 OFL 或同等，授权待确认，见 PENDING-LICENSES.md）；采用受限字库模式，仅整字显现，不提供逐笔书写。';

// ===== 字表与映射 =====
export interface LiGlyph {
  codePoint: number; // 渲染字符码位（若隶书按今字编码，则等于今字码位）
  modernChars: string[]; // 对应今字
}

export interface LiCharset {
  version: string;
  glyphs: LiGlyph[];
  modernIndex: Record<string, number>; // 今字(单字符) → 渲染码位，O(1) 查询
}

let charsetPromise: Promise<LiCharset | null> | null = null;

/** 加载隶书字表 JSON（静态资源）。缺失/失败返回 null（静默跳过，走恒等映射）。 */
export async function loadLiCharset(): Promise<LiCharset | null> {
  if (charsetPromise) return charsetPromise;
  charsetPromise = (async (): Promise<LiCharset | null> => {
    try {
      const res = await fetch(LI_MAP_URL);
      if (!res.ok) return null; // 资产缺失（隶书字表未随包）→ 该层不可用
      const raw = (await res.json()) as { version?: string; rows?: Array<Record<string, unknown>> };
      const glyphs: LiGlyph[] = [];
      const modernIndex: Record<string, number> = {};
      for (const row of raw.rows ?? []) {
        const seal = (row.seal as number) ?? (row.code as number);
        const mods: string[] = [];
        for (const key of ['ben_ch', 'jian_ch', 'li_ch', 'other_ch'] as const) {
          const arr = (row[key] as string[] | undefined) ?? [];
          for (const ch of arr) if (ch) mods.push(ch);
        }
        if (typeof seal !== 'number') continue;
        glyphs.push({ codePoint: seal, modernChars: mods });
        for (const ch of mods) if (!(ch in modernIndex)) modernIndex[ch] = seal;
      }
      return { version: raw.version ?? 'li-unknown', glyphs, modernIndex };
    } catch {
      return null;
    }
  })();
  return charsetPromise;
}

// ===== 字体注册 =====
let liFontReady = false;

/** 注册隶书字体（FontFace）。缺失资产时静默失败（不抛错）。 */
export async function registerLiFont(): Promise<boolean> {
  if (liFontReady) return true;
  if (typeof document === 'undefined' || !('fonts' in document)) return false; // SSR/jsdom 守卫
  const candidates = [LI_FONT_URL, LI_FALLBACK_URL];
  for (const url of candidates) {
    try {
      const face = new FontFace(LI_FONT_FAMILY, `url(${url})`);
      await face.load();
      (document as Document & { fonts: FontFaceSet }).fonts.add(face);
      liFontReady = true;
      return true;
    } catch {
      // 子集缺失 → 完整 TTF；仍失败 → 由系统隶书族兜底
    }
  }
  return false;
}

export function isLiFontReady(): boolean {
  return liFontReady;
}

/**
 * 隶书字体栈：注册成功用内置字族，否则回退系统隶书族（LiSu/STLiti）→ 衬线。
 * 保证即便隶书字体未随包，隶书路径也有可见字形（系统未装隶书族则衬线呈现）。
 */
export function getLiFontStack(): string {
  const fams: string[] = [];
  if (liFontReady) fams.push(`"${LI_FONT_FAMILY}"`);
  fams.push('"LiSu"', '"STLiti"', '"Songti SC"', '"SimSun"', 'serif');
  return fams.join(', ');
}

// ===== 映射与转换 =====
export interface LiTransformResult {
  renderChars: string[]; // 每个输入字符对应的渲染字符（越界位为原字符）
  outOfRange: string[]; // 越界字符集合（去重）
}

/** 今字 → 隶书渲染码位（单字表）。返回 null 表示越界。 */
export function modernToLi(ch: string, charset: LiCharset): number | null {
  return charset.modernIndex[ch] ?? null;
}

/**
 * 文本 → 渲染字符序列。
 * 字表存在：命中→隶书码位；越界→保留原字符并计入 outOfRange。
 * 字表缺失（null）：恒等映射，不拦截（隶书字体按常用字编码，交由字体栈兜底）。
 */
export function transformToLi(text: string, charset: LiCharset | null): LiTransformResult {
  const chars = Array.from(text);
  if (!charset) return { renderChars: chars, outOfRange: [] };
  const outOfRangeSet = new Set<string>();
  const renderChars: string[] = [];
  for (const ch of chars) {
    if (ch.trim().length === 0) {
      renderChars.push(ch);
      continue;
    }
    const hit = modernToLi(ch, charset);
    if (hit == null) {
      outOfRangeSet.add(ch);
      renderChars.push(ch);
    } else {
      renderChars.push(String.fromCodePoint(hit));
    }
  }
  return { renderChars, outOfRange: Array.from(outOfRangeSet) };
}

// ===== 覆盖率预估 =====
export interface LiCoverage {
  total: number;
  covered: number;
  ratio: number;
}

/** 估算文本的隶书覆盖率（GV-V2-06）。字表缺失时视为全覆盖（不拦截）。 */
export function estimateLiCoverage(text: string, charset: LiCharset | null): LiCoverage {
  let total = 0;
  let covered = 0;
  for (const ch of Array.from(text)) {
    if (ch.trim().length === 0) continue;
    total++;
    if (!charset || charset.modernIndex[ch] !== undefined) covered++;
  }
  return { total, covered, ratio: total === 0 ? 1 : covered / total };
}
