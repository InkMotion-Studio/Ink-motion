import { Card } from '@/components';
import { FONT_CATALOG } from '@/lib/fonts';
import { useT } from '@/lib/useI18n';
import {
  APP_LICENSE,
  THIRD_PARTY_LICENSES,
  attributionRequiredEntries,
  bundledLicenseFiles,
} from '@/lib/licenses';
import { versionString } from '@/lib/version';

export function AboutPage() {
  const t = useT();
  const required = attributionRequiredEntries();
  const optional = THIRD_PARTY_LICENSES.filter((l) => !l.attributionRequired);
  const bundled = bundledLicenseFiles();
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 'var(--im-fs-2xl)' }}>{t('nav.about')}</h1>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">墨演 InkMotion</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('app.tagline')}
        </p>
        <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
          {t('about.version')} {versionString()} · {APP_LICENSE.license}（{t('about.appLicense')}）
        </p>
      </Card>

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">字体许可与署名（IM-UI-001 §6.5.1 / IM-API-001 §5.1）</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {FONT_CATALOG.map((f) => (
            <li
              key={f.family}
              style={{
                padding: 'var(--im-space-3) 0',
                borderBottom: '1px solid var(--im-color-line)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{f.label}</strong>
                <span
                  style={{
                    fontSize: 'var(--im-fs-xs)',
                    color: f.available ? 'var(--im-color-success)' : 'var(--im-color-danger)',
                  }}
                >
                  {f.available ? f.license : '阻塞·未就绪'}
                </span>
              </div>
              <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)', margin: '4px 0' }}>
                {f.attribution}
              </p>
              <a href={f.licenseUrl} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--im-fs-xs)' }}>
                {t('about.licenseText')}
              </a>
              {f.note && (
                <p style={{ color: 'var(--im-color-danger)', fontSize: 'var(--im-fs-xs)', margin: '4px 0 0' }}>
                  {f.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* V1-C5 N5.2：随包许可文本（OFL.txt）可本地查阅，满足"许可随分发"合规要求 */}
      {bundled.length > 0 && (
        <Card style={{ marginBottom: 'var(--im-space-4)' }}>
          <h2 className="im-card__title">{t('about.bundledLicense')}</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2em', fontSize: 'var(--im-fs-sm)', lineHeight: 1.9 }}>
            {bundled.map((b) => (
              <li key={b.path}>
                <a href={b.path} target="_blank" rel="noreferrer">
                  {b.name} — OFL.txt（随包发布）
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card style={{ marginBottom: 'var(--im-space-4)' }}>
        <h2 className="im-card__title">{t('about.licenses')}</h2>
        <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)', marginTop: 0 }}>
          {t('about.licenses.note')}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {required.map((l) => (
            <li
              key={l.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--im-space-3)',
                padding: 'var(--im-space-2) 0',
                borderBottom: '1px solid var(--im-color-line)',
                fontSize: 'var(--im-fs-sm)',
              }}
            >
              <span>{l.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--im-space-2)' }}>
                <span style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
                  {l.license} · {t('about.attribution')}
                </span>
                <a href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--im-fs-xs)' }}>
                  {t('about.licenseText')}
                </a>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="im-card__title">{t('about.thirdParty')}</h2>
        <p style={{ color: 'var(--im-color-ink-soft)', fontSize: 'var(--im-fs-sm)' }}>
          {t('about.thirdParty.note')}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {optional.map((l) => (
            <li
              key={l.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--im-space-3)',
                padding: 'var(--im-space-2) 0',
                borderBottom: '1px solid var(--im-color-line)',
                fontSize: 'var(--im-fs-sm)',
                color: 'var(--im-color-ink-soft)',
              }}
            >
              <span>
                {l.name}
                <span style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
                  {' '}
                  — {l.usage}
                </span>
              </span>
              <span style={{ fontSize: 'var(--im-fs-xs)' }}>{l.license}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
