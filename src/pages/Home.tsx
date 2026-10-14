import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components';
import { listProjects, createProject } from '@/db/database';
import { PRESET_TEMPLATES } from '@/lib/presets';
import { useT } from '@/lib/useI18n';
import type { Project } from '@/db/types';

export function HomePage() {
  const navigate = useNavigate();
  const t = useT();
  const [recent, setRecent] = useState<Project[]>([]);

  useEffect(() => {
    listProjects().then(setRecent);
  }, []);

  const startPreset = async (id: string) => {
    const tpl = PRESET_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    const p = await createProject({ title: tpl.title, text: tpl.text, options: tpl.options });
    navigate(`/editor/${p.id}`);
  };

  const startBlank = async () => {
    const p = await createProject({ title: t('action.new'), text: '' });
    navigate(`/editor/${p.id}`);
  };

  return (
    <div className="im-home">
      <section className="im-home__hero">
        <h1 style={{ fontSize: 'var(--im-fs-3xl)' }}>{t('home.brand')}</h1>
        <p style={{ color: 'var(--im-color-ink-soft)', maxWidth: 640 }}>{t('app.tagline')}</p>
        <div style={{ display: 'flex', gap: 'var(--im-space-3)', marginTop: 'var(--im-space-4)' }}>
          <Button variant="primary" size="lg" onClick={startBlank}>
            {t('action.new')}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/projects')}>
            {t('action.myProjects')}
          </Button>
        </div>
      </section>

      <section style={{ marginTop: 'var(--im-space-7)' }}>
        <h2 style={{ fontSize: 'var(--im-fs-xl)' }}>{t('home.templates')}</h2>
        <div className="im-grid-3">
          {PRESET_TEMPLATES.map((tpl) => (
            <Card key={tpl.id}>
              <div
                className="im-preset-cover"
                style={{
                  background: 'var(--im-color-paper-deep)',
                  border: '1px solid var(--im-color-line)',
                  borderRadius: 'var(--im-radius-md)',
                  padding: 'var(--im-space-5)',
                  fontFamily: 'var(--im-font-kai)',
                  fontSize: 22,
                  color: 'var(--im-color-ink)',
                  marginBottom: 'var(--im-space-3)',
                  minHeight: 96,
                }}
              >
                {tpl.cover}
              </div>
              <h3 className="im-card__title" style={{ fontSize: 'var(--im-fs-md)' }}>
                {tpl.title}
              </h3>
              <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-sm)' }}>
                {tpl.text.length > 18 ? tpl.text.slice(0, 18) + '…' : tpl.text}
              </p>
              <Button variant="ghost" size="sm" onClick={() => startPreset(tpl.id)}>
                {t('action.useTemplate')}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 'var(--im-space-7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 'var(--im-fs-xl)' }}>{t('home.recent')}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            {t('action.viewAll')}
          </Button>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--im-color-ink-faint)' }}>{t('home.noProjects')}</p>
        ) : (
          <div className="im-grid-3">
            {recent.slice(0, 6).map((p) => (
              <Card key={p.id}>
                {p.thumbnail ? (
                  <img className="im-proj-thumb" src={p.thumbnail} alt={`${p.title} ${t('home.thumbAlt')}`} />
                ) : (
                  <div
                    className="im-preset-cover im-proj-thumb--empty"
                    style={{ fontFamily: 'var(--im-font-kai)' }}
                    aria-hidden="true"
                  >
                    {p.text.slice(0, 1) || '墨'}
                  </div>
                )}
                <h3 className="im-card__title" style={{ fontSize: 'var(--im-fs-md)' }}>
                  {p.title}
                </h3>
                <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-sm)' }}>
                  {p.text.length > 20 ? p.text.slice(0, 20) + '…' : p.text || t('home.textEmpty')}
                </p>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/editor/${p.id}`)}>
                  {t('action.open')}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
