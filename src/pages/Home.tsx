import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components';
import { listProjects, createProject } from '@/db/database';
import { PRESET_TEMPLATES } from '@/lib/presets';
import type { Project } from '@/db/types';

export function HomePage() {
  const navigate = useNavigate();
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
    const p = await createProject({ title: '未命名作品', text: '' });
    navigate(`/editor/${p.id}`);
  };

  return (
    <div className="im-home">
      <section className="im-home__hero">
        <h1 style={{ fontSize: 'var(--im-fs-3xl)' }}>墨演 InkMotion</h1>
        <p style={{ color: 'var(--im-color-ink-soft)', maxWidth: 640 }}>
          纯前端古典中文视频生成器。竖排右起、逐笔书写、宣纸竹简，本地生成视频，文本永不离开你的浏览器。
        </p>
        <div style={{ display: 'flex', gap: 'var(--im-space-3)', marginTop: 'var(--im-space-4)' }}>
          <Button variant="primary" size="lg" onClick={startBlank}>
            新建作品
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/projects')}>
            我的项目
          </Button>
        </div>
      </section>

      <section style={{ marginTop: 'var(--im-space-7)' }}>
        <h2 style={{ fontSize: 'var(--im-fs-xl)' }}>快速开始</h2>
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
                用此模板
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 'var(--im-space-7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 'var(--im-fs-xl)' }}>最近项目</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
            查看全部
          </Button>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--im-color-ink-faint)' }}>暂无项目，点击"新建作品"开始创作。</p>
        ) : (
          <div className="im-grid-3">
            {recent.slice(0, 6).map((p) => (
              <Card key={p.id}>
                {p.thumbnail ? (
                  <img className="im-proj-thumb" src={p.thumbnail} alt={`${p.title} 缩略图`} />
                ) : (
                  <div
                    className="im-proj-thumb im-proj-thumb--empty"
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
                  {p.text.length > 20 ? p.text.slice(0, 20) + '…' : p.text || '（空）'}
                </p>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/editor/${p.id}`)}>
                  打开
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
