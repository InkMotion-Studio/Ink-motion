import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Modal, Input, Select, toast } from '@/components';
import { listProjects, deleteProject, updateProject, db } from '@/db/database';
import { useT } from '@/lib/useI18n';
import type { Project } from '@/db/types';

type SortKey = 'updated' | 'created' | 'title';

export function ProjectsPage() {
  const navigate = useNavigate();
  const t = useT();
  const [items, setItems] = useState<Project[]>([]);
  const [toDelete, setToDelete] = useState<Project | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');

  const refresh = () => listProjects().then(setItems);
  useEffect(() => {
    refresh();
  }, []);

  const shown = useMemo(() => {
    const kw = q.trim();
    const filtered = kw ? items.filter((p) => p.title.includes(kw) || p.text.includes(kw)) : items;
    const sorted = [...filtered];
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
    else if (sort === 'created') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    return sorted;
  }, [items, q, sort]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteProject(toDelete.id);
    toast.success(t('projects.deleted'));
    setToDelete(null);
    refresh();
  };

  const duplicate = async (p: Project) => {
    const now = Date.now();
    const copy: Project = {
      ...p,
      id: crypto.randomUUID(),
      title: `${p.title} ${t('projects.duplicateSuffix')}`,
      createdAt: now,
      updatedAt: now,
    };
    await db.projects.add(copy);
    toast.success(t('projects.duplicated'));
    refresh();
  };

  const rename = async (p: Project) => {
    const next = window.prompt(t('projects.renamePrompt'), p.title);
    if (next && next.trim() && next !== p.title) {
      await updateProject(p.id, { title: next.trim() });
      refresh();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 'var(--im-fs-2xl)' }}>{t('projects.title')}</h1>
        <Button variant="primary" size="sm" onClick={() => navigate('/')}>
          {t('projects.new')}
        </Button>
      </div>

      <div className="im-toolbar">
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            placeholder={t('projects.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('projects.searchAria')}
          />
        </div>
        <div style={{ width: 190 }}>
          <Select
            value={sort}
            options={[
              { value: 'updated', label: t('projects.sort.updated') },
              { value: 'created', label: t('projects.sort.created') },
              { value: 'title', label: t('projects.sort.title') },
            ]}
            onChange={(v) => setSort(v as SortKey)}
            aria-label={t('projects.sortAria')}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <Card>
          <p style={{ color: 'var(--im-color-ink-faint)' }}>
            {items.length === 0 ? t('projects.empty') : t('projects.noMatch')}
          </p>
        </Card>
      ) : (
        <div className="im-grid-3">
          {shown.map((p) => (
            <Card key={p.id}>
              {p.thumbnail ? (
                <img className="im-proj-thumb" src={p.thumbnail} alt={`${p.title} ${t('home.thumbAlt')}`} />
              ) : (
                <div className="im-proj-thumb im-proj-thumb--empty" aria-hidden="true">
                  墨
                </div>
              )}
              <h3 className="im-card__title" style={{ fontSize: 'var(--im-fs-md)' }}>
                {p.title}
              </h3>
              <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-sm)' }}>
                {p.text.length > 24 ? p.text.slice(0, 24) + '…' : p.text || t('home.textEmpty')}
              </p>
              <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
                {new Date(p.updatedAt).toLocaleString()}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--im-space-2)',
                  marginTop: 'var(--im-space-2)',
                  flexWrap: 'wrap',
                }}
              >
                <Button variant="ghost" size="sm" onClick={() => navigate(`/editor/${p.id}`)}>
                  {t('projects.open')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => rename(p)}>
                  {t('projects.rename')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => duplicate(p)}>
                  {t('projects.duplicate')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setToDelete(p)}>
                  {t('projects.delete')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!toDelete}
        title={t('projects.deleteTitle')}
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              {t('modal.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('projects.delete')}
            </Button>
          </>
        }
      >
        {t('projects.deleteBody', { title: toDelete?.title ?? '' })}
      </Modal>
    </div>
  );
}
