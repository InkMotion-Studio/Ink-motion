// V1-C3 N3.2 字体管理：上传入口 + 已上传字体列表 + 删除
// 隐私：字体二进制仅存 IndexedDB，上传流程不产生任何网络请求。
import { useEffect, useRef, useState } from 'react';
import { Button, toast } from '@/components';
import { deleteFont } from '@/db/database';
import { useSettingsStore } from '@/store/settings';
import { uploadFont, FONT_SIZE_LIMIT, type FontUploadErrorCode } from '@/lib/fontUpload';
import { unregisterFont, isFontRegistered, uploadedFamilyName } from '@/lib/fontRegistry';
import { useT } from '@/lib/useI18n';
import type { FontRecord, FontFamily } from '@/db/types';

export function FontManager() {
  const t = useT();
  const fonts = useSettingsStore((s) => s.fonts);
  const refreshFonts = useSettingsStore((s) => s.refreshFonts);
  const [uploading, setUploading] = useState(false);
  const [family, setFamily] = useState<FontFamily>('kai');
  const fileRef = useRef<HTMLInputElement>(null);

  const familyOptions: Array<{ value: FontFamily; label: string }> = [
    { value: 'kai', label: t('font.target.kai') },
    { value: 'song', label: t('font.target.song') },
    { value: 'brush', label: t('font.target.brush') },
    { value: 'seal', label: t('font.target.seal') },
  ];

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
        toast.success(t('font.addOk', { name: res.record?.name ?? file.name }));
        await refreshFonts();
      } else {
        // V2-C4 N4.1：错误码经 i18n 呈现（{mb} 占位符由词条自带）
        const code: FontUploadErrorCode = res.error ?? 'font.err.generic';
        toast.error(t(code, { mb: limitMbForMsg }));
      }
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (f: FontRecord) => {
    if (!window.confirm(t('font.deleteConfirm', { name: f.name }))) return;
    await deleteFont(f.id);
    unregisterFont(f.id); // V2-C4 N4.1：同步从注册表移除，避免残留字族
    await refreshFonts();
    toast.success(t('font.deletedOk'));
  };

  const uploaded = fonts.filter((f) => f.source === 'uploaded');
  const limitMbForMsg = (FONT_SIZE_LIMIT / 1024 / 1024).toFixed(0);
  const limitMb = limitMbForMsg;

  return (
    <div className="im-font-mgr">
      <div className="im-font-mgr__head">
        <span>{t('font.manage')}</span>
        <span className="im-font-mgr__count">{t('font.uploadedCount', { n: uploaded.length })}</span>
      </div>
      <p className="im-font-mgr__tip">{t('settings.fonts.tip', { mb: limitMb })}</p>

      <div className="im-font-mgr__actions">
        <label className="im-font-mgr__family">
          <span>{t('font.pathBelong')}</span>
          <select
            value={family}
            onChange={(e) => setFamily(e.target.value as FontFamily)}
            aria-label={t('font.pathBelongAria')}
          >
            {familyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? t('font.uploading') : t('font.upload')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2,.ttc"
          className="im-sr-only"
          aria-label={t('font.pickFileAria')}
          onChange={onFile}
        />
      </div>

      {uploaded.length === 0 ? (
        <p className="im-font-mgr__empty">{t('font.none')}</p>
      ) : (
        <ul className="im-font-mgr__list">
          {uploaded.map((f) => {
            // V2-C4 N4.4：字样预览用已注册字体真实渲染，让"上传是否生效"一目了然
            const previewFamily = uploadedFamilyName(f.name);
            const active = isFontRegistered(f.id);
            return (
              <li key={f.id} className="im-font-mgr__item">
                <div className="im-font-mgr__info">
                  <strong>{f.name}</strong>
                  <span className="im-font-mgr__meta">
                    {f.format} · {f.license}
                  </span>
                </div>
                <div
                  className="im-font-mgr__preview"
                  style={{ fontFamily: active ? `"${previewFamily}", serif` : undefined }}
                  title={t('font.preview')}
                >
                  {t('font.previewSample')}
                </div>
                <span
                  className={
                    active ? 'im-font-mgr__badge im-font-mgr__badge--on' : 'im-font-mgr__badge'
                  }
                >
                  {active ? t('font.effective') : t('font.notEffective')}
                </span>
                <Button variant="danger" size="sm" onClick={() => onDelete(f)}>
                  {t('font.delete')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
