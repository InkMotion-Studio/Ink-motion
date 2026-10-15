// src/engine/customStroke.ts
// V2-C7 C4 · 用户定制兜底层（C 层）在引擎侧的读取封装。
//
// 三层查表优先级（最终形态）：
//   C 用户定制 > B(增强) > A(通用规范) > C3 字体轮廓兜底
// 本模块只负责 C 层的「内存缓存读取 + 失效通知」，数据实体存于 IndexedDB（db.customstrokes）。
// 设计要点：
//  - 引擎热路径不直接 await IndexedDB：先查内存缓存，未命中则回源并缓存（含「无定制」的负缓存）。
//  - 用户修改定制后调用 invalidateCustomStrokes()，下次查询回源。
//  - 无 IndexedDB 环境（SSR / jsdom 未注入）时安全降级为「无定制」。

import type { CustomStrokeRecord, CustomOutline } from '@/db/types';

type Loader = () => Promise<CustomStrokeRecord[]>;

let loaded = false;
let loading: Promise<void> | null = null;
let cache = new Map<string, CustomStrokeRecord>();
let loader: Loader | null = null;

/**
 * 注入数据源（默认从 Dexie 读取；测试可注入内存实现，避免依赖 IndexedDB）。
 * 生产环境在应用启动时调用一次即可；未调用前查询恒返回 null（安全降级）。
 */
export function setCustomStrokeLoader(fn: Loader): void {
  loader = fn;
}

async function ensureLoaded(): Promise<void> {
  if (loaded || !loader) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const records = await loader!();
      cache = new Map(records.map((r) => [r.char, r]));
      loaded = true;
    } catch {
      // 读取失败：保持空缓存（安全降级，不影响 A+B 权威表）
      loaded = true;
    }
  })();
  return loading;
}

/** 失效缓存，强制下次查询回源（用户修改定制后调用）。 */
export function invalidateCustomStrokes(): void {
  loaded = false;
  loading = null;
  cache = new Map();
}

/** 直接注入缓存（测试/导入后立即生效，避免再回源）。 */
export function primeCustomStrokes(records: CustomStrokeRecord[]): void {
  cache = new Map(records.map((r) => [r.char, r]));
  loaded = true;
}

/** C 层：查询某字的定制笔顺（26 字母编码串）；无定制返回 null。 */
export async function getCustomStrokeOrder(ch: string): Promise<string | null> {
  await ensureLoaded();
  return cache.get(ch)?.order ?? null;
}

/** C 层：查询某字的定制字形轮廓；无定制返回 null。 */
export async function getCustomOutline(ch: string): Promise<CustomOutline | null> {
  await ensureLoaded();
  return cache.get(ch)?.outline ?? null;
}

/** 测试辅助：重置全部状态。 */
export function __resetCustomStrokes(): void {
  loaded = false;
  loading = null;
  cache = new Map();
  loader = null;
}
