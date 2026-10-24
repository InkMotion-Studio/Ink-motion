// 纹理加载（N0.4 CDN 资产 → Cache API）。
// V1-C5 N5.1：URL 统一由 lib/assets.ts 版本化资产清单提供（v2 命名空间）。
// 纹理为可选增强：加载失败时载体回退程序化渲染，不影响功能。

import { assetUrl } from '@/lib/assets';

const cache = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

function urlFor(name: 'paper' | 'bamboo'): string {
  return assetUrl(name === 'paper' ? 'texture-paper' : 'texture-bamboo');
}

/** 同步取回已加载纹理（不触发加载）。 */
export function getTexture(name: 'paper' | 'bamboo'): HTMLImageElement | null {
  return cache.get(name) ?? null;
}

/** 异步加载纹理并缓存（失败返回 null）。 */
export function loadTexture(name: 'paper' | 'bamboo'): Promise<HTMLImageElement | null> {
  if (cache.has(name)) return Promise.resolve(cache.get(name)!);
  const exist = pending.get(name);
  if (exist) return exist;
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === 'undefined') {
      cache.set(name, null);
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cache.set(name, img);
      resolve(img);
    };
    img.onerror = () => {
      cache.set(name, null); // 记忆失败，回退程序化
      resolve(null);
    };
    img.src = urlFor(name);
  });
  pending.set(name, p);
  return p;
}

/** 预加载全部纹理（应用启动时调用）。 */
export function preloadTextures(): Promise<void> {
  return Promise.all([loadTexture('paper'), loadTexture('bamboo')]).then(() => undefined);
}
