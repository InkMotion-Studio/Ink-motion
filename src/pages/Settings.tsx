import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Select, FontManager, CustomStrokeManager, toast } from '@/components';
import { useSettingsStore } from '@/store/settings';
import { useT } from '@/lib/useI18n';
import { registerSealFont, type SealLayerSetting } from '@/lib/seal';
import {
  clearErrorLog,
  getErrorLog,
  getTelemetryConfig,
  setTelemetry,
} from '@/lib/telemetry';

function useStorageEstimate(calcText: string, unknownText: string, unsupportedText: string): string {
  const [info, setInfo] = useState(calcText);
  useEffect(() => {
    const estimate = async () => {
      // 估算 IndexedDB 占用（navigator.storage.estimate 为近似值）
      if (navigator.storage?.estimate) {
        const { usage } = await navigator.storage.estimate();
        setInfo(usage ? `${(usage / 1024 / 1024).toFixed(2)} MB` : unknownText);
      } else {
        setInfo(unsupportedText);
      }
    };
    estimate();
  }, [calcText, unknownText, unsupportedText]);
  return info;
}

export function SettingsPage() {
  const s = useSettingsStore();
  const navigate = useNavigate();
  const t = useT();
  const storage = useStorageEstimate(
    t('settings.storageCalc'),
    t('settings.storageUnknown'),
    t('settings.storageUnsupported'),
  );
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
          <Select
            label={t('settings.sealLayers')}
            value={s.sealLayers}
            options={[
              { value: 'L0', label: t('settings.sealLayers.L0') },
              { value: 'L0L1', label: t('settings.sealLayers.L0L1') },
              { value: 'all', label: t('settings.sealLayers.all') },
            ]}
            onChange={(v) => {
              const next = v as SealLayerSetting;
              s.setSealLayers(next);
              // V2-C1 N1.4：切换层级后按需注册对应层字体（缺失资产静默跳过）
              void registerSealFont(next);
            }}
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
            if (window.confirm(t('settings.clearConfirm'))) {
              indexedDB.deleteDatabase('inkmotion');
              toast.success(t('settings.clearRequested'));
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
        <h2 className="im-card__title">{t('custom.title')}</h2>
        <CustomStrokeManager />
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('settings.storage')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('settings.storageUsage')}<strong>{storage}</strong>
        </p>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('settings.diagnostics')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('settings.errorNote')}
        </p>
        <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
          {t('settings.errorCount')}<strong>{errorCount}</strong>
        </p>
        <div style={{ display: 'flex', gap: 'var(--im-space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-soft)' }}>
            <input
              type="checkbox"
              checked={telemetry.enabled}
              onChange={(e) => {
                void setTelemetry({ enabled: e.target.checked });
                setTelemetryState(getTelemetryConfig());
                toast.success(e.target.checked ? t('settings.errorReportOn') : t('settings.errorReportOff'));
              }}
            />{' '}
            {t('settings.errorReportToggle')}
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearErrorLog();
              setErrorCount(0);
              toast.success(t('settings.errorCleared'));
            }}
          >
            {t('settings.errorClear')}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="im-card__title">{t('settings.about')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('settings.aboutLine1')}
          <Button variant="ghost" size="sm" onClick={() => navigate('/about')}>
            {t('settings.about')}
          </Button>
          {t('settings.aboutLine2')}
        </p>
      </Card>
    </div>
  );
}
