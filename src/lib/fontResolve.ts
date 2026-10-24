// V2-C4 N4.1：字体解析
//
// 把「项目选项中的字体标识」解析为「实际可用的 CSS 字体栈」。
//
// 优先级：
//   1. customFontId 指向的字体记录（用户上传 / 扩展内置）→ 若已注册则用其内部字族名；未注册则退回内置栈
//   2. fontFamily 对应的内置栈
//
// 设计要点：解析结果必须是**可直接拼进 ctx.font 的裸串**（不含外层引号），
// 且末尾始终带通用兜底族（serif），避免字体缺失时渲染为浏览器默认无衬线体。

import type { FontRecord } from '@/db/types';
import { getBuiltinFontStack, isFontRegistered, uploadedFamilyName } from '@/lib/fontRegistry';

/**
 * 解析自定义字体栈。
 * @param customFontId 项目选项中的自定义字体 id（可为空）
 * @param records 当前字体列表（来自设置 store）
 * @returns CSS 字体栈字符串；未选中/不可用时返回 undefined（调用方回落内置栈）
 */
export function resolveFontStack(
  customFontId: string | undefined,
  records: FontRecord[],
): string | undefined {
  if (!customFontId) return undefined;

  const record = records.find((r) => r.id === customFontId);
  if (!record) return undefined;

  // 内置扩展字体（无二进制，靠 CSS @font-face 直接可用）
  if (!record.dataUrl) {
    const stack = getBuiltinFontStack(record.family);
    return stack === 'serif' ? undefined : stack;
  }

  // 用户上传字体：必须已注册成功才可用，否则回落（避免"选了却渲染不出"）
  if (!isFontRegistered(record.id)) return undefined;

  const family = uploadedFamilyName(record.name);
  return `"${family}", ${getBuiltinFontStack(record.family)}`;
}

/** 该自定义字体当前是否真的可用（供 UI 显示生效状态）。 */
export function isCustomFontUsable(
  customFontId: string | undefined,
  records: FontRecord[],
): boolean {
  if (!customFontId) return false;
  const record = records.find((r) => r.id === customFontId);
  if (!record) return false;
  if (!record.dataUrl) return getBuiltinFontStack(record.family) !== 'serif';
  return isFontRegistered(record.id);
}
