import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Input,
  toast,
  PreviewCanvas,
  ExportDialog,
  OptionsPanel,
  type PreviewHandle,
} from '@/components';
import { useEditorStore } from '@/store/editor';
import { TEXT_HARD_LIMIT, updateProject } from '@/db/database';
import { downloadProjectJSON, parseProjectJSON } from '@/lib/projectIO';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { project, dirty, loading, init, setTitle, setText, setOptions, save } = useEditorStore();
  const [exportOpen, setExportOpen] = useState(false);
  const previewRef = useRef<PreviewHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) init(id);
  }, [id, init]);

  const doSave = useCallback(async () => {
    await save();
    toast.success('已保存到本地');
  }, [save]);

  // 快捷键：Ctrl/Cmd+S 保存
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void doSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doSave]);

  // 缩略图：场景就绪后写回项目
  const onSnapshot = useCallback(
    (dataUrl: string) => {
      const p = useEditorStore.getState().project;
      if (p) void updateProject(p.id, { thumbnail: dataUrl });
    },
    [],
  );

  if (loading) return <p style={{ padding: 'var(--im-space-5)' }}>加载中…</p>;
  if (!project) return <p style={{ padding: 'var(--im-space-5)' }}>项目不存在。</p>;

  const remaining = TEXT_HARD_LIMIT - project.text.length;

  const onImport = async (file: File) => {
    try {
      const parsed = await parseProjectJSON(file);
      const p = await useEditorStore.getState().newBlank();
      const created = useEditorStore.getState().project;
      if (!created) return;
      setTitle(parsed.title);
      setText(parsed.text);
      setOptions(parsed.options);
      await useEditorStore.getState().save();
      toast.success('已导入作品');
      void p;
      navigate(`/editor/${created.id}`);
    } catch (e) {
      toast.error(`导入失败：${(e as Error).message}`);
    }
  };

  return (
    <div className="im-editor">
      <header className="im-editor__bar">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          ← 返回
        </Button>
        <Input
          value={project.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="作品标题"
          style={{ maxWidth: 260 }}
        />
        <span style={{ flex: 1 }} />
        <span
          aria-live="polite"
          style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-faint)' }}
        >
          {dirty ? '未保存' : '已保存'}
        </span>
        <Button variant="ghost" size="sm" onClick={() => downloadProjectJSON(project)}>
          导出工程
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
          导入工程
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="im-sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
        <Button variant="primary" size="sm" onClick={doSave}>
          保存
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            previewRef.current?.pause();
            setExportOpen(true);
          }}
        >
          导出视频
        </Button>
      </header>

      <div className="im-editor__grid">
        <section className="im-editor__pane" aria-label="文本输入">
          <h3 className="im-card__title">文本</h3>
          <textarea
            className="im-textarea"
            value={project.text}
            maxLength={TEXT_HARD_LIMIT}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要书写的古典诗文，竖排右起逐笔呈现…"
            aria-label="正文"
          />
          <p
            style={{
              fontSize: 'var(--im-fs-xs)',
              color: remaining < 200 ? 'var(--im-color-danger)' : 'var(--im-color-ink-faint)',
            }}
          >
            剩余 {remaining} / {TEXT_HARD_LIMIT} 字
          </p>
        </section>

        <section className="im-editor__pane im-editor__preview" aria-label="实时预览">
          <h3 className="im-card__title">实时预览</h3>
          <PreviewCanvas ref={previewRef} project={project} onSnapshot={onSnapshot} />
        </section>

        <section className="im-editor__pane" aria-label="参数面板">
          <h3 className="im-card__title">参数</h3>
          <OptionsPanel options={project.options} onChange={setOptions} />
        </section>
      </div>

      <ExportDialog
        open={exportOpen}
        project={project}
        onClose={() => setExportOpen(false)}
        onFrame={(t) => previewRef.current?.seek(t)}
      />
    </div>
  );
}
