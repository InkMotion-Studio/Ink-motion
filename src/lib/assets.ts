// 资产与 CDN 流水线（N0.4 / IM-DB-001 §6.3）
// 约定：所有字体 / 纹理以命名空间 `inkmotion-assets-v1` 版本化托管。
// 纯前端：资产经 CDN 加载后用 Cache API 缓存，离线可用；绝不回传用户数据。

export const ASSET_NAMESPACE = 'inkmotion-assets-v1';
export const ASSET_CACHE_NAME = `inkmotion-assets-v1`;

// 部署时替换为实际 CDN 前缀（N5.1）。本地开发回退到 public/ 静态目录。
export const CDN_BASE: string =
  (import.meta.env?.VITE_ASSET_CDN as string | undefined) ?? '/';

export interface AssetEntry {
  key: string;
  path: string; // 相对 CDN_BASE 的路径
  kind: 'font' | 'texture' | 'data';
  version: string;
}

// 资产清单：新增资产必须登记于此并附版本，确保缓存版本化（IM-DB-001 §6.3）
export const ASSET_MANIFEST: AssetEntry[] = [
  { key: 'texture-paper', path: 'textures/paper.png', kind: 'texture', version: '1.0.0' },
  { key: 'texture-bamboo', path: 'textures/bamboo.png', kind: 'texture', version: '1.0.0' },
  // 楷体（Arphic UKai）由系统字体或 CDN 提供；Hanzi Writer 笔画数据走独立 CDN（见 lib/fonts.ts）
  // 宋体（Source Han Serif）为可选增强，未随包分发（体积考虑），缺失时回退系统衬线
];

export function assetUrl(key: string): string {
  const entry = ASSET_MANIFEST.find((a) => a.key === key);
  if (!entry) throw new Error(`未知资产：${key}`);
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

/** 预缓存清单内全部资产（首次启动或版本升级时调用）。 */
export async function precacheAssets(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const cache = await caches.open(ASSET_CACHE_NAME);
  let ok = 0;
  for (const a of ASSET_MANIFEST) {
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
      // 单个资产失败不阻断其余（纹理为可选增强）
    }
  }
  return ok;
}
