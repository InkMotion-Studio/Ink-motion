// V1-C3 N3.2 字体管理：上传入口 + 已上传字体列表 + 删除
// 隐私：字体二进制仅存 IndexedDB，上传流程不产生任何网络请求。
import { useEffect, useRef, useState } from 'react';
import { Button, toast } from '@/components';
import { deleteFont } from '@/db/database';
import { useSettingsStore } from '@/store/settings';
import { uploadFont, FONT_SIZE_LIMIT } from '@/lib/fontUpload';
import type { FontRecord, FontFamily } from '@/db/types';

const FAMILY_OPTIONS: Array<{ value: FontFamily; label: string }> = [
  { value: 'kai', label: '楷体路径' },
  { value: 'song', label: '宋体路径' },
  { value: 'seal', label: '小篆路径' },
];

export function FontManager() {
  const fonts = useSettingsStore((s) => s.fonts);
  const refreshFonts = useSettingsStore((s) => s.refreshFonts);
  const [uploading, setUploading] = useState(false);
  const [family, setFamily] = useState<FontFamily>('kai');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 首次挂载确保列表已加载
    if (fonts.length === 0) void refreshFonts();
  }, [fonts.length, refreshFonts]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFont(file, { family });
      if (res.ok) {
        toast.success(`已添加字体「${res.record?.name ?? file.name}」`);
        await refreshFonts();
      } else {
        toast.error(res.error ?? '字体上传失败');
      }
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (f: FontRecord) => {
    if (!window.confirm(`确认删除字体「${f.name}」？`)) return;
    await deleteFont(f.id);
    await refreshFonts();
    toast.success('已删除字体');
  };

  const uploaded = fonts.filter((f) => f.source === 'uploaded');
  const limitMb = (FONT_SIZE_LIMIT / 1024 / 1024).toFixed(0);

  return (
    <div className="im-font-mgr">
      <div className="im-font-mgr__head">
        <span>字体管理</span>
        <span className="im-font-mgr__count">已上传 {uploaded.length} 个</span>
      </div>
      <p className="im-font-mgr__tip">
        支持 .ttf / .otf / .woff / .woff2，单个文件上限 {limitMb}MB。字体仅保存在本机浏览器，不会上传。
      </p>

      <div className="im-font-mgr__actions">
        <label className="im-font-mgr__family">
          <span>归属路径</span>
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value as FontFamily)}
            aria-label="上传字体归属路径"
          >
            {FAMILY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '上传中…' : '上传字体'}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,.ttc"
          className="im-sr-only"
          aria-label="选择要上传的字体文件"
          onChange={onFile}
        />
      </div>

      {uploaded.length === 0 ? (
        <p className="im-font-mgr__empty">尚未上传任何字体。</p>
      ) : (
        <ul className="im-font-mgr__list">
          {uploaded.map((f) => (
            <li key={f.id} className="im-font-mgr__item">
              <div>
                <strong>{f.name}</strong>
                <span className="im-font-mgr__meta">
                  {f.format} · {f.license}
                </span>
              </div>
              <Button variant="danger" size="sm" onClick={() => onDelete(f)}>
                删除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
