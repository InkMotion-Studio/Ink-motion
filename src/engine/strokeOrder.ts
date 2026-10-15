// src/engine/strokeOrder.ts
// C1/C2 · 运行期笔顺查表（A+B 层权威数据 + 本地按需加载）
// 数据由 scripts/build-strokeorder.mjs 在构建期从 cnchar（依据《现代汉语通用字笔顺规范》GF 3002-1999
// 及《通用规范汉字表》）导出为 public/strokeorder/*.json，运行期零依赖、按需分片加载。
//
// 三层查表优先级（C 层用户定制在 C4 接入）：
//   用户定制 > B 层(全量增强) > A 层(通用规范) —— 当前内置 A+B 合并为单一权威表，
//   因为导出时已按码段统一覆盖，运行期只需按字符码位定位分片。

export interface StrokeOrderManifest {
  generatedBy: string;
  source: string;
  encoding: Record<string, string>;
  range: { start: number; end: number };
  total: number;
  missing: number;
  chunks: { file: string; start: number; end: number; chars: number }[];
}

const MANIFEST_URL = 'strokeorder/strokeorder.manifest.json';
const DATA_BASE = 'strokeorder/';

// 运行时缓存：分片已加载的字符->笔顺序列（26 字母编码串，如 "gesl"）
const chunkCache = new Map<string, Record<string, string>>();
let manifestCache: StrokeOrderManifest | null = null;

function chunkFileFor(codePoint: number): string | null {
  if (!manifestCache) return null;
  const c = manifestCache.chunks.find((x) => codePoint >= x.start && codePoint <= x.end);
  return c ? c.file : null;
}

async function ensureManifest(): Promise<StrokeOrderManifest | null> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) return null;
    manifestCache = (await res.json()) as StrokeOrderManifest;
    return manifestCache;
  } catch {
    return null;
  }
}

async function ensureChunk(file: string): Promise<Record<string, string> | null> {
  const cached = chunkCache.get(file);
  if (cached) return cached;
  try {
    const res = await fetch(DATA_BASE + file);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, string>;
    chunkCache.set(file, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * 查询单字笔顺（A+B 层权威数据）。
 * @returns 26 字母笔顺序列串（如 "gesl"），未收录返回 null（由 C 层/C3 轮廓兜底处理）。
 */
export async function getStrokeOrder(ch: string): Promise<string | null> {
  const cp = ch.codePointAt(0);
  if (cp == null) return null;
  const manifest = await ensureManifest();
  if (!manifest) return null;
  if (cp < manifest.range.start || cp > manifest.range.end) return null;
  const file = chunkFileFor(cp);
  if (!file) return null;
  const chunk = await ensureChunk(file);
  if (!chunk) return null;
  return chunk[ch] ?? null;
}

/** 同步查询（仅用于已加载分片，性能敏感路径）。 */
export function getStrokeOrderSync(ch: string): string | null {
  const cp = ch.codePointAt(0);
  if (cp == null || !manifestCache) return null;
  if (cp < manifestCache.range.start || cp > manifestCache.range.end) return null;
  const file = chunkFileFor(cp);
  if (!file) return null;
  const chunk = chunkCache.get(file);
  return chunk ? chunk[ch] ?? null : null;
}

/** 解码笔顺字母串为可读笔画名数组（供 UI/调试）。 */
export function decodeStrokeOrder(seq: string, encoding: Record<string, string>): string[] {
  return [...seq].map((c) => encoding[c] ?? c);
}

/** 预加载一批字符所在分片（避免逐字请求）。 */
export async function preloadStrokeOrder(chars: string[]): Promise<void> {
  const manifest = await ensureManifest();
  if (!manifest) return;
  const files = new Set<string>();
  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    if (cp == null) continue;
    if (cp < manifest.range.start || cp > manifest.range.end) continue;
    const f = chunkFileFor(cp);
    if (f) files.add(f);
  }
  await Promise.all([...files].map((f) => ensureChunk(f)));
}

/** 测试/调试辅助：清空缓存。 */
export function __clearStrokeOrderCache(): void {
  chunkCache.clear();
  manifestCache = null;
}
