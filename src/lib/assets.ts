// 资产与 CDN 流水线（N0.4 / N5.1 / IM-DB-001 §6.3 / IM-OPS-001 §6）
// 约定：所有字体 / 纹理 / 字库以命名空间 `inkmotion-assets-v2` 版本化托管。
// 纯前端：资产经 CDN 加载后用 Cache API 缓存，离线可用；绝不回传用户数据。
//
// V1-C5 N5.1 变更：
// 1) 命名空间与缓存名由 v1 升至 v2（新增小篆字库资产，缓存版本化升级）；
// 2) 修复同源回退路径：未配置 VITE_ASSET_CDN 时直接引用 public/ 下的相对路径，
//    此前会误拼为 `/inkmotion-assets-v1/...`，在静态托管下 404（预缓存静默失败）；
// 3) 新增历史缓存清理（purgeLegacyAssetCaches），避免旧版本资产长期占用配额（IM-DB-001 §6.4）。

export const ASSET_NAMESPACE = 'inkmotion-assets-v2';
export const ASSET_CACHE_NAME = 'inkmotion-assets-v2';

/** 历史缓存名：版本升级时清理，防止旧资产长期占用配额。 */
export const LEGACY_ASSET_CACHE_NAMES: readonly string[] = ['inkmotion-assets-v1'];

/** CDN 前缀（部署期注入 VITE_ASSET_CDN）。留空 = 同源静态托管（public/ 直接发布）。 */
export const CDN_BASE: string = readCdnBase();

function readCdnBase(): string {
  try {
    const raw = (import.meta.env?.VITE_ASSET_CDN as string | undefined) ?? '';
    return String(raw).trim().replace(/\s+/g, '');
  } catch {
    return '';
  }
}

export interface AssetEntry {
  key: string;
  path: string; // 相对 CDN_BASE（或同源根）的路径
  kind: 'font' | 'texture' | 'data' | 'license';
  version: string;
  /** 是否参与启动预缓存（大体积回退字体按需加载，不预缓存）。 */
  precache?: boolean;
}

// 资产清单：新增资产必须登记于此并附版本，确保缓存版本化（IM-DB-001 §6.3）
export const ASSET_MANIFEST: AssetEntry[] = [
  { key: 'texture-paper', path: 'textures/paper.png', kind: 'texture', version: '1.0.0', precache: true },
  { key: 'texture-bamboo', path: 'textures/bamboo.png', kind: 'texture', version: '1.0.0', precache: true },
  // V1-C5 N5.1：小篆字库资产（霞鹜篆书 LXGW Seal，OFL 1.1）
  { key: 'seal-font', path: 'fonts/seal/LXGWSeal-Glyphs.woff2', kind: 'font', version: '2.0.0', precache: true },
  { key: 'seal-map', path: 'fonts/seal/seal-map.json', kind: 'data', version: '2.0.0', precache: true },
  { key: 'seal-license', path: 'fonts/seal/OFL.txt', kind: 'license', version: '2.0.0', precache: true },
  // 回退字体（完整 TTF 223KB）：仅主用 woff2 子集加载失败时使用，不预缓存
  { key: 'seal-font-fallback', path: 'fonts/seal/LXGWSeal-Regular.ttf', kind: 'font', version: '2.0.0', precache: false },
  // 楷体（Arphic UKai）由系统字体或 CDN 提供；Hanzi Writer 笔画数据走独立 CDN（见 lib/fonts.ts）
  // 宋体（Source Han Serif）为可选增强，未随包分发（体积考虑），缺失时回退系统衬线
];

export function getAssetEntry(key: string): AssetEntry | undefined {
  return ASSET_MANIFEST.find((a) => a.key === key);
}

/** 是否配置了外部 CDN（否则为同源静态托管）。 */
export function isCdnMode(): boolean {
  return CDN_BASE.length > 0;
}

export function assetUrl(key: string): string {
  const entry = getAssetEntry(key);
  if (!entry) throw new Error(`未知资产：${key}`);
  if (!isCdnMode()) return `/${entry.path}`; // 同源：public/ 根路径
  const base = CDN_BASE.endsWith('/') ? CDN_BASE : CDN_BASE + '/';
  return `${base}${ASSET_NAMESPACE}/${entry.path}`;
}

/** 版本化缓存获取：优先 Cache API，未命中则网络拉取并回填。 */
export async function fetchAssetCached(key: string): Promise<Response> {
  if (typeof caches === 'undefined') {
    return fetch(assetUrl(key));
  }
  const cache = await caches.open(ASSET_CACHE_NAME);
  const url = assetUrl(key);
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (res.ok) {
    // 仅克隆可缓存的响应
    cache.put(url, res.clone()).catch(() => undefined);
  }
  return res;
}

/**
 * 清理历史版本缓存（IM-DB-001 §6.4 / IM-OPS-001 §6 回滚与容量）。
 * 版本升级时调用一次；返回被成功删除的缓存名。当前版本永不被清理。
 */
export async function purgeLegacyAssetCaches(
  names: readonly string[] = LEGACY_ASSET_CACHE_NAMES,
): Promise<string[]> {
  if (typeof caches === 'undefined' || typeof caches.keys !== 'function') return [];
  const removed: string[] = [];
  for (const name of names) {
    if (name === ASSET_CACHE_NAME) continue;
    try {
      const ok = await caches.delete(name);
      if (ok) removed.push(name);
    } catch {
      // 平台不支持删除时静默跳过
    }
  }
  return removed;
}

/** 当前已存在的资产缓存名（含历史版本），用于诊断与迁移验证。 */
export async function listAssetCaches(): Promise<string[]> {
  if (typeof caches === 'undefined' || typeof caches.keys !== 'function') return [];
  const all = await caches.keys();
  return all.filter((n) => n.startsWith('inkmotion-assets-'));
}

/**
 * 预缓存清单内全部资产（首次启动或版本升级时调用）。
 * 返回成功缓存数量；单个资产失败不阻断其余（纹理为可选增强）。
 */
export async function precacheAssets(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  await purgeLegacyAssetCaches();
  const cache = await caches.open(ASSET_CACHE_NAME);
  let ok = 0;
  for (const a of ASSET_MANIFEST) {
    if (a.precache === false) continue;
    try {
      const url = assetUrl(a.key);
      if (!(await cache.match(url))) {
        const res = await fetch(url);
        if (res.ok) {
          await cache.put(url, res.clone());
          ok++;
        }
      } else {
        ok++;
      }
    } catch {
      // 单个资产失败不阻断其余
    }
  }
  return ok;
}
