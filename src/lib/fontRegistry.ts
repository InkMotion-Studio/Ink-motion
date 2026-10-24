// V2-C4 N4.1：字体注册中心
//
// 解决的问题（V2-C4 自检发现的断点 1）：
//   V1.0/V2-C3 的 `uploadFont()` 只把 FontFace 注册到当前页面的 `document.fonts`，
//   并写入 IndexedDB；但**刷新后从不重新注册**，且 `ProjectOptions` 无承载字段，
//   导致上传的字体既进不了渲染管线、重启后也彻底失效 —— 即"字体上传毫无作用"。
//
// 本模块统一管理「内置字体 + 用户上传字体」的 FontFace 注册与字体栈解析，
// 并提供启动期恢复（从 IndexedDB 批量重注册）。
//
// 隐私红线：字体二进制只在本地 IndexedDB 与内存中流转，绝不产生网络请求上传。

import type { FontRecord } from '@/db/types';

/** 用户上传字体的内部字族名前缀（避免与内置字族冲突）。 */
export const UPLOADED_FAMILY_PREFIX = 'im-uploaded-';

/** 由字体显示名推导内部字族名（与 fontUpload.ts 保持一致，勿单独修改）。 */
export function uploadedFamilyName(name: string): string {
  return `${UPLOADED_FAMILY_PREFIX}${name.replace(/\s+/g, '-')}`;
}

/** 已成功注册的字体：fontId → 内部字族名。 */
const registeredFamilies = new Map<string, string>();
/** 进行中的注册（防并发重复注册同一字体）。 */
const inFlight = new Map<string, Promise<string | null>>();

/** 内置字体字族栈：family → CSS font-family 值（无引号包裹的裸串，含兜底）。 */
const BUILTIN_FONT_STACKS: Record<string, string> = {
  kai: '"LXGW WenKai", "Kaiti SC", "KaiTi", "STKaiti", serif',
  song: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", serif',
  brush: '"Ma Shan Zheng", "Kaiti SC", "KaiTi", serif',
  seal: '"LXGW Seal", "im-seal-font", serif',
  li: '"LiSu", "STLiti", "SimLi", serif',
};

/** 取内置字体的 CSS 字体栈（未知 family 回退衬线）。 */
export function getBuiltinFontStack(family: string): string {
  return BUILTIN_FONT_STACKS[family] ?? 'serif';
}

/**
 * 注册一个字体记录到 `document.fonts`（幂等）。
 * 成功返回内部字族名；无二进制（如 CDN/内置）或注册失败返回 null。
 */
export async function registerFontRecord(record: FontRecord): Promise<string | null> {
  if (!record.dataUrl) return null; // 无本地二进制（内置/CDN 字体）无需注册
  const existing = registeredFamilies.get(record.id);
  if (existing) return existing;

  const pending = inFlight.get(record.id);
  if (pending) return pending;

  const familyName = uploadedFamilyName(record.name);
  const task = (async () => {
    try {
      const face = new FontFace(familyName, `url(${record.dataUrl})`);
      await face.load();
      (document as Document & { fonts: FontFaceSet }).fonts.add(face);
      registeredFamilies.set(record.id, familyName);
      return familyName;
    } catch {
      return null; // 解析失败：静默降级（不阻断启动，调用方回退内置字体栈）
    } finally {
      inFlight.delete(record.id);
    }
  })();

  inFlight.set(record.id, task);
  return task;
}

/**
 * 启动期恢复：把 IndexedDB 中所有带二进制的字体批量重注册。
 * 这是修复"刷新后字体失效"的关键路径。返回成功注册的数量。
 */
export async function restoreFonts(records: FontRecord[]): Promise<number> {
  const candidates = records.filter((r) => !!r.dataUrl);
  const results = await Promise.all(candidates.map((r) => registerFontRecord(r)));
  return results.filter(Boolean).length;
}

/** 从注册表移除（删除字体时调用）。 */
export function unregisterFont(fontId: string): void {
  registeredFamilies.delete(fontId);
  inFlight.delete(fontId);
}

/** 该字体是否已注册成功（可用于 UI 显示"生效中"）。 */
export function isFontRegistered(fontId: string): boolean {
  return registeredFamilies.has(fontId);
}

/** 测试用：清空注册表。 */
export function __clearFontRegistry(): void {
  registeredFamilies.clear();
  inFlight.clear();
}
