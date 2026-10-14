import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Select, FontManager, toast } from '@/components';
import { useSettingsStore } from '@/store/settings';
import { useT } from '@/lib/useI18n';
import {
  clearErrorLog,
  getErrorLog,
  getTelemetryConfig,
  setTelemetry,
} from '@/lib/telemetry';

function useStorageEstimate(): string {
  const [info, setInfo] = useState('计算中…');
  useEffect(() => {
    const estimate = async () => {
      // 估算 IndexedDB 占用（navigator.storage.estimate 为近似值）
      if (navigator.storage?.estimate) {
        const { usage } = await navigator.storage.estimate();
        setInfo(usage ? `${(usage / 1024 / 1024).toFixed(2)} MB` : '未知');
      } else {
        setInfo('当前浏览器不支持存储估算');
      }
    };
    estimate();
  }, []);
  return info;
}

export function SettingsPage() {
  const s = useSettingsStore();
  const navigate = useNavigate();
  const t = useT();
  const storage = useStorageEstimate();
  const [reduced, setReduced] = useState(s.reduceMotion);
  const [telemetry, setTelemetryState] = useState(getTelemetryConfig());
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    setErrorCount(getErrorLog().length);
  }, []);

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 'var(--im-fs-2xl)' }}>{t('settings.title')}</h1>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('settings.preferences')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--im-space-4)' }}>
          <Select
            label={t('settings.theme')}
            value={s.theme}
            options={[
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
            onChange={(v) => s.setTheme(v as 'light' | 'dark')}
          />
          <Select
            label={t('settings.language')}
            value={s.language}
            options={[
              { value: 'zh', label: t('settings.language.zh') },
              { value: 'en', label: t('settings.language.en') },
            ]}
            onChange={(v) => s.setLanguage(v as 'zh' | 'en')}
          />
          <Select
            label={t('settings.carrier')}
            value={s.defaultCarrier}
            options={[
              { value: 'paper', label: t('template.paper') + ' ' + t('options.carrier.paper') },
              { value: 'bamboo', label: t('template.bamboo') + ' ' + t('options.carrier.bamboo') },
            ]}
            onChange={(v) => s.setDefaultCarrier(v as 'paper' | 'bamboo')}
          />
          <label style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-soft)' }}>
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => {
                setReduced(e.target.checked);
                s.setReduceMotion(e.target.checked);
              }}
            />{' '}
            {t('settings.reduceMotion')}
          </label>
        </div>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('settings.privacy')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('settings.privacy.body')}
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (window.confirm('确认清除全部本地数据（项目/导出/设置）？')) {
              indexedDB.deleteDatabase('inkmotion');
              toast.success('已请求清除，刷新后生效');
            }
          }}
        >
          {t('settings.clearData')}
        </Button>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('settings.fonts')}</h2>
        <FontManager />
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('settings.storage')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          本地数据库占用估算：<strong>{storage}</strong>
        </p>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('settings.diagnostics')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          错误日志仅保存在本机（不上传）。默认关闭匿名错误上报；开启后仅发送错误元数据（不含文本/项目内容）。
        </p>
        <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
          本地记录错误数：<strong>{errorCount}</strong>
        </p>
        <div style={{ display: 'flex', gap: 'var(--im-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-soft)' }}>
            <input
              type="checkbox"
              checked={telemetry.enabled}
              onChange={(e) => {
                void setTelemetry({ enabled: e.target.checked });
                setTelemetryState(getTelemetryConfig());
                toast.success(e.target.checked ? '已开启匿名错误上报' : '已关闭错误上报');
              }}
            />{' '}
            允许匿名错误上报（默认关闭）
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearErrorLog();
              setErrorCount(0);
              toast.success('已清空本地错误日志');
            }}
          >
            清空错误日志
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="im-card__title">{t('settings.about')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          墨演 InkMotion。字体与开源组件遵循各自许可，详见
          <Button variant="ghost" size="sm" onClick={() => navigate('/about')}>
            {t('settings.about')}
          </Button>
          页。
        </p>
      </Card>
    </div>
  );
}
