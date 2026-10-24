// V1-C3 N3.1 字体上传 / V2-C4 N4.1 接入注册中心
// 用户选择本地字体文件 → 格式/体积校验 → FontFace 注册 → 存入 IndexedDB（source='uploaded'）。
// 隐私红线：字体二进制只进 IndexedDB，绝不上传（IM-SRS-001 / C1 门禁）。
//
// V2-C4 N4.1：FontFace 注册统一走 `fontRegistry`，使上传字体与内置字体共享同一套
// 注册/恢复/栈解析逻辑；启动期由 `restoreFonts()` 从 IndexedDB 批量恢复，修复"刷新即失效"。
import { putFont, deleteFont } from '@/db/database';
import { registerFontRecord, unregisterFont } from '@/lib/fontRegistry';
import type { FontRecord, FontFormat, FontFamily } from '@/db/types';

/** 单字体文件体积上限（base64 后约膨胀 33%，8MB 原始 → ~10.7MB 落库） */
export const FONT_SIZE_LIMIT = 8 * 1024 * 1024;
/** 允许的格式（与 FontFormat 对应） */
const EXT_FORMAT: Record<string, FontFormat> = {
  '.ttf': 'truetype',
  '.otf': 'opentype',
  '.woff2': 'woff2',
  '.woff': 'woff2',
  '.ttc': 'truetype',
};

export interface UploadedFontMeta {
  name: string;
  family: FontFamily;
  format: FontFormat;
  license: string;
  sizeBytes: number;
}

export interface UploadResult {
  ok: boolean;
  record?: FontRecord;
  /** 错误码（i18n 键），由 UI 翻译后展示。 */
  error?: FontUploadErrorCode;
}

/** 按扩展名判定格式，未知返回 null。 */
export function detectFormat(fileName: string): FontFormat | null {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return EXT_FORMAT[ext] ?? null;
}

/** 校验：格式与体积。返回错误码（由 UI 经 i18n 呈现），通过返回 null。 */
export type FontUploadErrorCode =
  | 'font.err.format'
  | 'font.err.tooLarge'
  | 'font.err.empty'
  | 'font.err.read'
  | 'font.err.parse'
  | 'font.err.generic';

export function validateFontFile(file: { name: string; size: number }): FontUploadErrorCode | null {
  if (!detectFormat(file.name)) return 'font.err.format';
  if (file.size > FONT_SIZE_LIMIT) return 'font.err.tooLarge';
  if (file.size === 0) return 'font.err.empty';
  return null;
}

function toDataUrl(buf: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('font.err.read'));
    reader.readAsDataURL(new Blob([buf]));
  });
}

/**
 * V2-C4 N4.1：上传并登记字体。
 * 顺序为「先落库拿到 id → 再按记录注册 FontFace」，使注册表能按 fontId 索引，
 * 从而支持启动期恢复、删除时注销、以及 UI 的"生效中"状态展示。
 */
export async function uploadFont(
  file: File,
  opts: { family: FontFamily; license?: string; name?: string },
): Promise<UploadResult> {
  const err = validateFontFile(file);
  if (err) return { ok: false, error: err };

  const format = detectFormat(file.name)!;
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const name = opts.name?.trim() || baseName;

  try {
    const buf = await file.arrayBuffer();
    const dataUrl = await toDataUrl(buf);

    // 先落库（拿到 id），再注册
    const record = await putFont({
      name,
      family: opts.family,
      source: 'uploaded',
      format,
      license: opts.license?.trim() || '用户上传（许可自负）',
      dataUrl,
    });

    const familyName = await registerFontRecord(record);
    if (!familyName) {
      // 字体文件损坏/格式不受支持：已落库但无法注册 → 回滚，避免用户看到"已上传却不可用"
      await deleteFont(record.id);
      unregisterFont(record.id);
      return { ok: false, error: 'font.err.parse' };
    }

    return { ok: true, record };
  } catch (e) {
    // 仅已知错误码透传，其余归为通用失败（不泄漏内部信息）
    const code = e instanceof Error && e.message.startsWith('font.err.') ? (e.message as FontUploadErrorCode) : 'font.err.generic';
    return { ok: false, error: code };
  }
}
