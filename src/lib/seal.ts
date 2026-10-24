// V2-C1 N1.1 + N1.2：篆书分层字源引擎（L0 霞鹜保底 + L1 敬峰主力 + L2 全字库最大覆盖）
// 设计决策 D-V1-01（受限字库 + 真实字形映射）在 V1.0 落地；V2-C1 升级为多字源分层。
//
// 分层策略（IM-GLYPH-V2-001 §3）：三层均映射到 Unicode 18.0 小篆码位（U+3D000+），
// 故采用「动态字体回退栈」——按优先级 L1→L0→L2 组成 ctx.font 字体族，浏览器自动选取首个
// 含该字形码位的字源。合并 modernIndex 按相同优先级去重，L1 优先于 L0（覆盖更广且仍在维护）。
//
// 合规政策 D-V2-02（用户决策 2026-10-14）：L1/L2 字源一律采用；其字体二进制与映射表若未随包提供，
// 加载器静默跳过该层（架构就绪、资产待按 D-V2-02 采用并登记，见 PENDING-LICENSES.md）。

import { assetUrl } from '@/lib/assets';

// ===== 向后兼容常量（V1.0 既有导出，保持签名不变） =====
export const SEAL_FONT_FAMILY = 'LXGW Seal'; // L0 基础字族
export const SEAL_FONT_URL = assetUrl('seal-font'); // 子集化 woff2（主用）
export const SEAL_MAP_URL = assetUrl('seal-map');
export const SEAL_OFL_URL = assetUrl('seal-license'); // OFL.txt 随包发布
export const SEAL_FALLBACK_URL = assetUrl('seal-font-fallback'); // 完整 TTF（按需回退）
export const SEAL_LICENSE = 'OFL' as const;
export const SEAL_LICENSE_URL = 'https://scripts.sil.org/OFL';
export const SEAL_ATTRIBUTION =
  '小篆字形基于《霞鹜篆书》LXGW Seal（SIL 开放字体许可 OFL 1.1），兼容 Unicode 18.0 小篆区块。';

// ===== 分层字源配置（V2-C1 N1.1 / IM-GLYPH-V2-001 §3.1） =====
export type SealLayerId = 'L0' | 'L1' | 'L2';
export type SealLayerSetting = 'L0' | 'L0L1' | 'all'; // 字源层级开关（设置项 sealLayers）

export interface SealLayerConfig {
  id: SealLayerId;
  family: string; // FontFace 注册字族名
  fontUrl: string; // 子集化 woff2（资产清单 key）
  fallbackUrl?: string; // 完整 TTF（按需回退）
  mapUrl: string; // 今字↔小篆码位映射 JSON（资产清单 key）
  license: string; // 许可标识
  attribution: string; // 署名/来源说明
  /** 是否参与启动预缓存（L1/L2 体积大、按需，默认不预缓存） */
  precache: boolean;
  /** 默认启用（受设置项 sealLayers 进一步约束） */
  defaultEnabled: boolean;
}

export const SEAL_LAYERS: Record<SealLayerId, SealLayerConfig> = {
  // L0 保底：V1.0 已集成，停止维护，必装（首屏可用）
  L0: {
    id: 'L0',
    family: 'LXGW Seal',
    fontUrl: assetUrl('seal-font'),
    fallbackUrl: assetUrl('seal-font-fallback'),
    mapUrl: assetUrl('seal-map'),
    license: 'OFL-1.1',
    attribution: SEAL_ATTRIBUTION,
    precache: true,
    defaultEnabled: true,
  },
  // L1 主力：敬峰中山王篆（OFL，~2832 字）。V2.0 纳入（TBD-V2-01 关闭）；资产待按 D-V2-02 提供
  L1: {
    id: 'L1',
    family: 'JFZS Seal',
    fontUrl: assetUrl('seal-font-l1'),
    fallbackUrl: assetUrl('seal-font-l1-fallback'),
    mapUrl: assetUrl('seal-map-l1'),
    license: 'OFL',
    attribution: '敬峰中山王篆（OFL；V2.0 纳入，授权待确认，见 PENDING-LICENSES.md）',
    precache: false,
    defaultEnabled: true,
  },
  // L2 完整：全字库说文解字（台湾地区政府资料开放授权，可商用，6721 字）。V2.0 纳入（用户决策）
  L2: {
    id: 'L2',
    family: 'TW Seal',
    fontUrl: assetUrl('seal-font-l2'),
    fallbackUrl: assetUrl('seal-font-l2-fallback'),
    mapUrl: assetUrl('seal-map-l2'),
    license: 'OpenGov-TW',
    attribution: '全字库说文解字（台湾地区政府资料开放授权，可商用；V2.0 纳入）',
    precache: false,
    defaultEnabled: false,
  },
};

/** 字体回退栈顺序：L1 优先（主力）→ L0 保底 → L2 最大覆盖。 */
export const SEAL_LAYER_ORDER: SealLayerId[] = ['L1', 'L0', 'L2'];

/** 由设置项解析启用的层（L0 始终包含，保证首屏可用）。 */
export function layersForSetting(setting: SealLayerSetting): SealLayerId[] {
  if (setting === 'L0') return ['L0'];
  if (setting === 'L0L1') return ['L0', 'L1'];
  return ['L0', 'L1', 'L2'];
}

// ===== 字表与合并索引 =====
export interface SealGlyph {
  codePoint: number; // 小篆码位，如 0x3D01E（福）
  modernChars: string[]; // 对应今字（本字/简化字/隶定字/异体），如 ['福']
  layer: SealLayerId; // 所属字源层
}

export interface SealCharset {
  version: string; // 字表版本
  layer: SealLayerId; // 单层字表
  glyphs: SealGlyph[];
  modernIndex: Record<string, number>; // 今字(单字符) → 小篆码位，O(1) 查询
}

export interface SealRegistry {
  layers: SealLayerId[]; // 启用且加载成功的层（按优先级）
  modernIndex: Record<string, { codePoint: number; layer: SealLayerId }>; // 优先级去重合并索引
  coverageChars: Set<string>; // 可覆盖的今字集合
}

const charsetCache = new Map<SealLayerId, Promise<SealCharset | null>>();

/** 加载单层字表 JSON（构建期生成自官方 table.md，静态资源）。缺失/失败返回 null（静默跳过该层）。 */
export async function loadSealCharset(layer: SealLayerId = 'L0'): Promise<SealCharset | null> {
  if (charsetCache.has(layer)) return charsetCache.get(layer)!;
  const p = (async (): Promise<SealCharset | null> => {
    try {
      const res = await fetch(SEAL_LAYERS[layer].mapUrl);
      if (!res.ok) return null; // 资产缺失（如 L1/L2 未随包）→ 该层不可用
      const raw = (await res.json()) as { version: string; rows: Array<Record<string, unknown>> };
      const glyphs: SealGlyph[] = [];
      const modernIndex: Record<string, number> = {};
      for (const row of raw.rows) {
        const seal = row.seal as number;
        const mods: string[] = [];
        for (const key of ['ben_ch', 'jian_ch', 'li_ch', 'other_ch'] as const) {
          const arr = (row[key] as string[] | undefined) ?? [];
          for (const ch of arr) if (ch) mods.push(ch);
        }
        glyphs.push({ codePoint: seal, modernChars: mods, layer });
        for (const ch of mods) {
          if (!(ch in modernIndex)) modernIndex[ch] = seal; // 冲突时保留首个
        }
      }
      return { version: raw.version ?? `seal-${layer}-unknown`, layer, glyphs, modernIndex };
    } catch {
      return null;
    }
  })();
  charsetCache.set(layer, p);
  return p;
}

/** 合并注册表：按设置项加载启用层，合并为优先级去重索引（L1→L0→L2）。 */
export async function loadSealRegistry(setting: SealLayerSetting = 'L0'): Promise<SealRegistry | null> {
  const wanted = layersForSetting(setting);
  const loaded = await Promise.all(wanted.map(async (l) => ({ l, cs: await loadSealCharset(l) })));
  const ok = loaded.filter((x) => x.cs) as Array<{ l: SealLayerId; cs: SealCharset }>;
  if (ok.length === 0) return null;
  const modernIndex: SealRegistry['modernIndex'] = {};
  // 按优先级排序：高优先级先写，低优先级不覆盖（L1 优先于 L0）
  const sorted = ok.slice().sort((a, b) => SEAL_LAYER_ORDER.indexOf(a.l) - SEAL_LAYER_ORDER.indexOf(b.l));
  for (const { cs } of sorted) {
    for (const ch of Object.keys(cs.modernIndex)) {
      if (!(ch in modernIndex)) modernIndex[ch] = { codePoint: cs.modernIndex[ch], layer: cs.layer };
    }
  }
  return { layers: sorted.map((s) => s.l), modernIndex, coverageChars: new Set(Object.keys(modernIndex)) };
}

/** 将合并注册表转为向后兼容的 SealCharset（供既有 transformToSeal 复用）。 */
export function mergedSealCharset(reg: SealRegistry): SealCharset {
  const modernIndex: Record<string, number> = {};
  for (const ch of Object.keys(reg.modernIndex)) modernIndex[ch] = reg.modernIndex[ch].codePoint;
  return {
    version: `seal-merged-${reg.layers.join('-')}`,
    layer: 'L0',
    glyphs: [],
    modernIndex,
  };
}

// ===== 字体注册（L1/L2 缺失时静默跳过） =====
export type SealFontSource = 'subset' | 'fallback' | 'none';
let sealFontSource: SealFontSource = 'none';
const registeredLayers = new Set<SealLayerId>();

/** 注册单层字体（FontFace）。缺失资产时静默失败，不影响其他层。 */
export async function registerSealLayer(layer: SealLayerId): Promise<boolean> {
  if (registeredLayers.has(layer)) return true;
  if (typeof document === 'undefined' || !('fonts' in document)) return false; // SSR/jsdom 守卫
  const cfg = SEAL_LAYERS[layer];
  const candidates: string[] = [cfg.fontUrl];
  if (cfg.fallbackUrl) candidates.push(cfg.fallbackUrl);
  for (const url of candidates) {
    try {
      const face = new FontFace(cfg.family, `url(${url})`);
      await face.load();
      (document as Document & { fonts: FontFaceSet }).fonts.add(face);
      registeredLayers.add(layer);
      sealFontSource = 'subset';
      return true;
    } catch {
      // 尝试下一个候选（子集缺失 → 完整 TTF；仍失败 → 跳过该层）
    }
  }
  return false;
}

/**
 * 注册启用层的字体（默认 L0；L1/L2 资产缺失时静默跳过）。
 * 调用方负责在渲染前 await（main.tsx 启动注册 + 编辑器按需补注册）。
 */
export async function registerSealFont(setting: SealLayerSetting = 'L0'): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const wanted = layersForSetting(setting);
  await Promise.all(wanted.map((l) => registerSealLayer(l)));
}

/** 当前生效的小篆字体栈（按 L1→L0→L2 优先级；含系统衬线兜底）。渲染层据此设 ctx.font。 */
export function getSealFontStack(): string {
  const fams = SEAL_LAYER_ORDER.filter((l) => registeredLayers.has(l)).map((l) => `"${SEAL_LAYERS[l].family}"`);
  if (fams.length) return `${fams.join(', ')}, "Songti SC", "SimSun", serif`;
  return `"${SEAL_FONT_FAMILY}", "Songti SC", "SimSun", serif`;
}

export function getRegisteredSealLayers(): SealLayerId[] {
  return SEAL_LAYER_ORDER.filter((l) => registeredLayers.has(l));
}

export function isSealFontReady(): boolean {
  return registeredLayers.size > 0;
}

/** 向后兼容：返回最后生效的字体来源（subset/fallback/none）。 */
export function getSealFontSource(): SealFontSource {
  return sealFontSource;
}

// ===== 映射与转换（向后兼容签名 + 新增分层版本） =====

/** 今字 → 小篆码位（单字表）。返回 null 表示越界。 */
export function modernToSeal(ch: string, charset: SealCharset): number | null {
  return charset.modernIndex[ch] ?? null;
}

/** 今字 → 小篆码位（合并注册表，按启用层与优先级）。返回 null 表示越界。 */
export function modernToSealV2(ch: string, reg: SealRegistry): { codePoint: number; layer: SealLayerId } | null {
  return reg.modernIndex[ch] ?? null;
}

export interface SealTransformResult {
  renderChars: string[]; // 每个输入字符对应的渲染字符（越界位为原字符）
  outOfRange: string[]; // 越界字符集合（去重）
}

/** 文本 → 渲染字符序列（单字表版本，向后兼容）。 */
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
      renderChars.push(ch);
    } else {
      renderChars.push(String.fromCodePoint(seal));
    }
  }
  return { renderChars, outOfRange: Array.from(outOfRangeSet) };
}

/** 文本 → 渲染字符序列（合并注册表版本，渲染层使用）。 */
export function transformToSealV2(text: string, reg: SealRegistry): SealTransformResult {
  const outOfRangeSet = new Set<string>();
  const renderChars: string[] = [];
  for (const ch of Array.from(text)) {
    if (ch.trim().length === 0) {
      renderChars.push(ch);
      continue;
    }
    const hit = modernToSealV2(ch, reg);
    if (hit == null) {
      outOfRangeSet.add(ch);
      renderChars.push(ch);
    } else {
      renderChars.push(String.fromCodePoint(hit.codePoint));
    }
  }
  return { renderChars, outOfRange: Array.from(outOfRangeSet) };
}

// ===== 覆盖率预估（V2-C1 N1.2 / N1.4） =====
export interface SealCoverage {
  total: number; // 非空白字符数
  covered: number; // 可被任一启用层覆盖的字符数
  ratio: number; // covered / total（0~1）
  layers: SealLayerId[]; // 实际生效层
}

/** 估算文本在给定注册表下的篆书覆盖率（GV-V2-04）。 */
export function estimateSealCoverage(text: string, reg: SealRegistry): SealCoverage {
  let total = 0;
  let covered = 0;
  for (const ch of Array.from(text)) {
    if (ch.trim().length === 0) continue;
    total++;
    if (reg.coverageChars.has(ch)) covered++;
  }
  return {
    total,
    covered,
    ratio: total === 0 ? 1 : covered / total,
    layers: reg.layers,
  };
}

/** 古文字路径可用性：字表与字体均就绪才视为可用（GV-V2-01/GV-V2-02）。 */
export async function ensureSealReady(setting: SealLayerSetting = 'L0'): Promise<boolean> {
  try {
    const reg = await loadSealRegistry(setting);
    await registerSealFont(setting);
    return isSealFontReady() && !!reg && reg.coverageChars.size > 0;
  } catch {
    return false;
  }
}
