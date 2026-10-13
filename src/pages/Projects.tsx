import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Modal, Input, Select, toast } from '@/components';
import { listProjects, deleteProject, updateProject, db } from '@/db/database';
import type { Project } from '@/db/types';

type SortKey = 'updated' | 'created' | 'title';

export function ProjectsPage() {
  const navigate = useNavigate();
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
    toast.success('已删除');
    setToDelete(null);
    refresh();
  };

  const duplicate = async (p: Project) => {
    const now = Date.now();
    const copy: Project = {
      ...p,
      id: crypto.randomUUID(),
      title: `${p.title} 副本`,
      createdAt: now,
      updatedAt: now,
    };
    await db.projects.add(copy);
    toast.success('已创建副本');
    refresh();
  };

  const rename = async (p: Project) => {
    const next = window.prompt('重命名作品', p.title);
    if (next && next.trim() && next !== p.title) {
      await updateProject(p.id, { title: next.trim() });
      refresh();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 'var(--im-fs-2xl)' }}>我的项目</h1>
        <Button variant="primary" size="sm" onClick={() => navigate('/')}>
          新建
        </Button>
      </div>

      <div className="im-toolbar">
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input
            placeholder="搜索标题或正文…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="搜索项目"
          />
        </div>
        <div style={{ width: 190 }}>
          <Select
            value={sort}
            options={[
              { value: 'updated', label: '按修改时间' },
              { value: 'created', label: '按创建时间' },
              { value: 'title', label: '按标题' },
            ]}
            onChange={(v) => setSort(v as SortKey)}
            aria-label="排序方式"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <Card>
          <p style={{ color: 'var(--im-color-ink-faint)' }}>
            {items.length === 0 ? '还没有作品。从首页新建或选用模板。' : '没有匹配的项目。'}
          </p>
        </Card>
      ) : (
        <div className="im-grid-3">
          {shown.map((p) => (
            <Card key={p.id}>
              {p.thumbnail ? (
                <img className="im-proj-thumb" src={p.thumbnail} alt={`${p.title} 缩略图`} />
              ) : (
                <div className="im-proj-thumb im-proj-thumb--empty" aria-hidden="true">
                  墨
                </div>
              )}
              <h3 className="im-card__title" style={{ fontSize: 'var(--im-fs-md)' }}>
                {p.title}
              </h3>
              <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-sm)' }}>
                {p.text.length > 24 ? p.text.slice(0, 24) + '…' : p.text || '（空）'}
              </p>
              <p style={{ color: 'var(--im-color-ink-faint)', fontSize: 'var(--im-fs-xs)' }}>
                {new Date(p.updatedAt).toLocaleString('zh-CN')}
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
                  打开
                </Button>
                <Button variant="ghost" size="sm" onClick={() => rename(p)}>
                  重命名
                </Button>
                <Button variant="ghost" size="sm" onClick={() => duplicate(p)}>
                  复制
                </Button>
                <Button variant="danger" size="sm" onClick={() => setToDelete(p)}>
                  删除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!toDelete}
        title="确认删除"
        onClose={() => setToDelete(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              删除
            </Button>
          </>
        }
      >
        确定删除《{toDelete?.title}》？该操作不可撤销，相关导出记录也会一并清除。
      </Modal>
    </div>
  );
}
