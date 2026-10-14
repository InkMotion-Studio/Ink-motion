// V1-C3 N3.1 字体上传
// 用户选择本地字体文件 → 格式/体积校验 → FontFace 注册 → 存入 IndexedDB（source='uploaded'）。
// 隐私红线：字体二进制只进 IndexedDB，绝不上传（IM-SRS-001 / C1 门禁）。
import { putFont } from '@/db/database';
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
  error?: string;
}

/** 按扩展名判定格式，未知返回 null。 */
export function detectFormat(fileName: string): FontFormat | null {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return EXT_FORMAT[ext] ?? null;
}

/** 校验：格式与体积。返回错误文案，通过返回 null。 */
export function validateFontFile(file: { name: string; size: number }): string | null {
  if (!detectFormat(file.name)) {
    return '不支持的字体格式，请选择 .ttf / .otf / .woff / .woff2 文件';
  }
  if (file.size > FONT_SIZE_LIMIT) {
    const mb = (FONT_SIZE_LIMIT / 1024 / 1024).toFixed(0);
    return `字体文件过大（上限 ${mb}MB）`;
  }
  if (file.size === 0) return '文件为空';
  return null;
}

function toDataUrl(buf: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('字体文件读取失败'));
    reader.readAsDataURL(new Blob([buf]));
  });
}

/** 注册字体到 document.fonts（成功返回 true）。family 名为内部标识，避免与内置字体冲突。 */
export async function registerUploadedFont(
  familyName: string,
  dataUrl: string,
): Promise<boolean> {
  try {
    const face = new FontFace(familyName, `url(${dataUrl})`);
    await face.load();
    document.fonts.add(face);
    return true;
  } catch {
    return false;
  }
}

/**
 * 上传并登记字体：校验 → 读取 dataURL → FontFace 注册 → 落库。
 * 任一步失败返回 ok:false + 错误文案（不抛异常，便于 UI 提示）。
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
  // 内部 family 名加前缀，避免与内置 kai/song/seal 冲突
  const familyName = `im-uploaded-${name.replace(/\s+/g, '-')}`;

  try {
    const buf = await file.arrayBuffer();
    const dataUrl = await toDataUrl(buf);
    const ok = await registerUploadedFont(familyName, dataUrl);
    if (!ok) return { ok: false, error: '字体解析失败，文件可能已损坏或格式不受支持' };

    const record = await putFont({
      name,
      family: opts.family,
      source: 'uploaded',
      format,
      license: opts.license?.trim() || '用户上传（许可自负）',
      dataUrl,
    });
    return { ok: true, record };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '字体上传失败' };
  }
}
