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
import { useSealOutOfRange } from '@/lib/useSeal';
import { useT } from '@/lib/useI18n';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const { project, dirty, loading, init, setTitle, setText, setOptions, save } = useEditorStore();
  const [exportOpen, setExportOpen] = useState(false);
  const previewRef = useRef<PreviewHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) init(id);
  }, [id, init]);

  const doSave = useCallback(async () => {
    await save();
    toast.success(t('editor.saved'));
  }, [save, t]);

  // V1-C1 N1.3：古文字路径越界字符检测与提示（TC-V1-GLY-07 / IM-UI-001 §14.3）
  // 必须置于所有提前 return 之前，保证 hooks 调用顺序稳定
  const outOfRange = useSealOutOfRange(project?.text ?? '', project?.options.fontFamily ?? 'kai');

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
          {t('action.back')}
        </Button>
        <Input
          value={project.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label={t('editor.title')}
          style={{ maxWidth: 260 }}
        />
        <span style={{ flex: 1 }} />
        <span
          aria-live="polite"
          style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-faint)' }}
        >
          {dirty ? t('action.unsaved') : t('editor.saved')}
        </span>
        <Button variant="ghost" size="sm" onClick={() => downloadProjectJSON(project)}>
          {t('action.exportProject')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
          {t('action.importProject')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="im-sr-only"
          aria-label="选择要导入的工程 JSON 文件"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
        <Button variant="primary" size="sm" onClick={doSave}>
          {t('action.save')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            previewRef.current?.pause();
            setExportOpen(true);
          }}
        >
          {t('action.export')}
        </Button>
      </header>

      <div className="im-editor__grid">
        <section className="im-editor__pane" aria-label={t('editor.body')}>
          <h3 className="im-card__title">{t('editor.body')}</h3>
          <textarea
            className="im-textarea"
            value={project.text}
            maxLength={TEXT_HARD_LIMIT}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入要书写的古典诗文，竖排右起逐笔呈现…"
            aria-label={t('editor.body')}
          />
          <p
            style={{
              fontSize: 'var(--im-fs-xs)',
              color: remaining < 200 ? 'var(--im-color-danger)' : 'var(--im-color-ink-faint)',
            }}
          >
            {t('editor.charRemaining')} {remaining} / {TEXT_HARD_LIMIT} 字
          </p>
          {project.options.fontFamily === 'seal' && (
            <p
              className="im-editor__seal-hint"
              aria-live="polite"
              role="status"
              style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-ink-faint)' }}
            >
              {outOfRange.length === 0
                ? '小篆（受限字库）：当前文本均在字表内，可完整呈现。'
                : `${t('seal.outOfRangeHint')}「${outOfRange.join('')}」`}
              <br />
              古文字路径为受限字库模式，不提供逐笔书写，仅整字显现。
            </p>
          )}
        </section>

        <section className="im-editor__pane im-editor__preview" aria-label={t('editor.preview')}>
          <h3 className="im-card__title">{t('editor.preview')}</h3>
          <PreviewCanvas ref={previewRef} project={project} onSnapshot={onSnapshot} />
        </section>

        <section className="im-editor__pane" aria-label={t('editor.options')}>
          <h3 className="im-card__title">{t('editor.options')}</h3>
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
