import { Card } from '@/components';
import { useT } from '@/lib/useI18n';

// V1-C2 N2.4 帮助页：书写路径 / 越界跳过 / 许可 / 隐私说明（文案经 i18n 抽取）
export function HelpPage() {
  const t = useT();
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 'var(--im-fs-2xl)' }}>{t('help.title')}</h1>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('help.fontPaths')}</h2>
        <ul style={{ margin: 0, paddingLeft: '1.2em', color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)', lineHeight: 1.7 }}>
          <li>
            <strong>{t('template.kai')}：</strong>
            {t('help.kai')}
          </li>
          <li>
            <strong>{t('template.song')}：</strong>
            {t('help.song')}
          </li>
          <li>
            <strong>{t('template.seal')}：</strong>
            {t('help.seal')}
          </li>
          <li>
            <strong>{t('template.li')}：</strong>
            {t('help.li')}
          </li>
        </ul>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('settings.privacy')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('settings.privacy.body')}
        </p>
      </Card>

      {/* V1-C5 N5.2：TBD-V1-04 结论落地——4K 目标浏览器以 Chromium 桌面版为准，其余环境降级说明 */}
      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('help.browsers')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('help.browsers.body')}
        </p>
      </Card>

      <Card>
        <h2 className="im-card__title">{t('help.license')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('settings.about')}
        </p>
      </Card>
    </div>
  );
}
