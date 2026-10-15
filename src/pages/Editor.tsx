import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Input,
  toast,
  PreviewCanvas,
  ExportDialog,
  OptionsPanel,
  type OptionGroupKey,
  type PreviewHandle,
} from '@/components';
import { useEditorStore } from '@/store/editor';
import { TEXT_HARD_LIMIT, updateProject } from '@/db/database';
import { downloadProjectJSON, parseProjectJSON } from '@/lib/projectIO';
import { useSealOutOfRange, useSealCoverage } from '@/lib/useSeal';
import { useLiOutOfRange, useLiCoverage } from '@/lib/useLi';
import { useFontUnsupported } from '@/lib/useFontCoverage';
import { useT } from '@/lib/useI18n';

/** V2-C5 N5.1：左右栏折叠态的本地持久化键（避免每次进入都手动收起） */
const LS_BODY_OPEN = 'im.editor.bodyOpen';
const LS_OPTIONS_OPEN = 'im.editor.optionsOpen';

function readCollapsed(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const { project, dirty, loading, init, setTitle, setText, setOptions, save } = useEditorStore();
  const [exportOpen, setExportOpen] = useState(false);
  const previewRef = useRef<PreviewHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // V2-C5 N5.1：左右栏可折叠；状态持久化。
  const [bodyOpen, setBodyOpen] = useState(() => readCollapsed(LS_BODY_OPEN, true));
  const [optionsOpen, setOptionsOpen] = useState(() => readCollapsed(LS_OPTIONS_OPEN, true));
  // V2-C5 N5.2：参数分组手风琴展开态（默认仅前四组展开，画布/动画收起以降低噪声）
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    carrier: true,
    font: true,
    write: true,
    scroll: false,
    canvas: false,
    animation: false,
  });

  useEffect(() => {
    if (id) init(id);
  }, [id, init]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_BODY_OPEN, bodyOpen ? '1' : '0');
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }, [bodyOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_OPTIONS_OPEN, optionsOpen ? '1' : '0');
    } catch {
      /* 同上 */
    }
  }, [optionsOpen]);

  const doSave = useCallback(async () => {
    await save();
    toast.success(t('editor.saved'));
  }, [save, t]);

  // V1-C1 N1.3：古文字路径越界字符检测与提示（TC-V1-GLY-07 / IM-UI-001 §14.3）
  // 必须置于所有提前 return 之前，保证 hooks 调用顺序稳定
  const outOfRange = useSealOutOfRange(project?.text ?? '', project?.options.fontFamily ?? 'kai');
  const sealCoverage = useSealCoverage(project?.text ?? '', project?.options.fontFamily ?? 'kai');
  // V2-C2 N2.2：隶书路径越界检测与覆盖率（与篆书并行，独立提示块）
  const liOutOfRange = useLiOutOfRange(project?.text ?? '', project?.options.fontFamily ?? 'kai');
  const liCoverage = useLiCoverage(project?.text ?? '', project?.options.fontFamily ?? 'kai');
  // V2-C7 C7 BUG-005：整字路径（楷/宋/毛笔楷）字体缺字检测与提示
  const fontUnsupported = useFontUnsupported(
    project?.text ?? '',
    project?.options.fontFamily ?? 'kai',
  );

  // V2-C7 C7 BUG-002 修复：离开编辑器（卸载 / 路由切换）或页面隐藏时，
  // 立即 flush 未落库的编辑，避免「编辑后直接返回」造成数据丢失。
  useEffect(() => {
    const flush = () => {
      void useEditorStore.getState().flush();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
      // 组件卸载 = 离开本编辑页 → 兜底保存
      flush();
    };
  }, []);

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
  const onSnapshot = useCallback((dataUrl: string) => {
    const p = useEditorStore.getState().project;
    if (p) void updateProject(p.id, { thumbnail: dataUrl });
  }, []);

  if (loading) return <p style={{ padding: 'var(--im-space-5)' }}>{t('editor.loading')}</p>;
  if (!project) return <p style={{ padding: 'var(--im-space-5)' }}>{t('editor.notFound')}</p>;

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
      toast.success(t('editor.importOk'));
      void p;
      navigate(`/editor/${created.id}`);
    } catch (e) {
      toast.error(t('editor.importFail', { msg: (e as Error).message }));
    }
  };

  const bodyWordCount = project.text.length;

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
        <span className="im-editor__bar-spacer" />
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
          aria-label={t('editor.importAria')}
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

      <div
        className="im-editor__grid"
        data-body-open={bodyOpen ? 'true' : 'false'}
        data-options-open={optionsOpen ? 'true' : 'false'}
      >
        {/* 左栏：正文（可折叠） */}
        <section
          className={`im-editor__pane im-editor__pane--body${bodyOpen ? '' : ' im-editor__pane--collapsed'}`}
          aria-label={t('editor.body')}
        >
          <div className="im-editor__panehead">
            <h3 className="im-card__title">{t('editor.body')}</h3>
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={bodyOpen}
              onClick={() => setBodyOpen((v) => !v)}
            >
              {bodyOpen ? t('editor.collapse') : t('editor.expand')}
            </Button>
          </div>
          {bodyOpen ? (
            <div className="im-editor__panebody">
              <textarea
                className="im-textarea"
                value={project.text}
                maxLength={TEXT_HARD_LIMIT}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('editor.bodyPlaceholder')}
                aria-label={t('editor.body')}
              />
              <p
                style={{
                  fontSize: 'var(--im-fs-xs)',
                  color: remaining < 200 ? 'var(--im-color-danger)' : 'var(--im-color-ink-faint)',
                  margin: 0,
                }}
              >
                {t('editor.charRemaining')} {remaining} / {TEXT_HARD_LIMIT}
                {t('editor.charUnit')}
              </p>
              {project.options.fontFamily !== 'seal' &&
                project.options.fontFamily !== 'li' &&
                fontUnsupported.length > 0 && (
                  <p
                    className="im-editor__font-hint"
                    aria-live="polite"
                    role="status"
                    style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-danger)' }}
                  >
                    {t('font.unsupportedHint')}
                    {fontUnsupported.slice(0, 40).join('')}
                    {fontUnsupported.length > 40 ? '…' : ''}」——{t('font.unsupportedTip')}
                  </p>
                )}
              {project.options.fontFamily === 'seal' && (
                <p
                  className="im-editor__seal-hint"
                  aria-live="polite"
                  role="status"
                  style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-ink-faint)' }}
                >
                  {outOfRange.length === 0
                    ? t('editor.sealInRange')
                    : `${t('seal.outOfRangeHint')}「${outOfRange.join('')}」`}
                  <br />
                  {t('editor.restrictedNote')}
                  {sealCoverage && (
                    <>
                      <br />
                      {t('seal.coverage')}：{Math.round(sealCoverage.ratio * 100)}%（
                      {sealCoverage.covered}/{sealCoverage.total} 字）
                    </>
                  )}
                </p>
              )}
              {project.options.fontFamily === 'li' && (
                <p
                  className="im-editor__li-hint"
                  aria-live="polite"
                  role="status"
                  style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-ink-faint)' }}
                >
                  {liOutOfRange.length === 0
                    ? t('editor.liInRange')
                    : `${t('li.outOfRangeHint')}「${liOutOfRange.join('')}」`}
                  <br />
                  {t('editor.restrictedNote')}
                  {liCoverage && !liCoverage.charsetAvailable && (
                    <>
                      <br />
                      {t('li.charsetPending')}
                    </>
                  )}
                  {liCoverage && liCoverage.charsetAvailable && (
                    <>
                      <br />
                      {t('seal.coverage')}：{Math.round(liCoverage.ratio * 100)}%（
                      {liCoverage.covered}/{liCoverage.total} 字）
                    </>
                  )}
                </p>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="im-editor__rail"
                onClick={() => setBodyOpen(true)}
                title={t('editor.expand')}
              >
                {t('editor.body')}
              </button>
              <p className="im-editor__collapsed-hint">
                {t('editor.collapsedBody', { n: bodyWordCount })}
              </p>
            </>
          )}
        </section>

        {/* 中栏：预览（按画布比例等比缩放居中） */}
        <section
          className="im-editor__pane im-editor__pane--preview im-editor__preview"
          aria-label={t('editor.preview')}
        >
          <PreviewCanvas ref={previewRef} project={project} onSnapshot={onSnapshot} />
        </section>

        {/* 右栏：参数（可折叠，分组手风琴） */}
        <section
          className={`im-editor__pane im-editor__pane--options${optionsOpen ? '' : ' im-editor__pane--collapsed'}`}
          aria-label={t('editor.options')}
        >
          <div className="im-editor__panehead">
            <h3 className="im-card__title">{t('editor.options')}</h3>
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={optionsOpen}
              onClick={() => setOptionsOpen((v) => !v)}
            >
              {optionsOpen ? t('editor.collapse') : t('editor.expand')}
            </Button>
          </div>
          {optionsOpen ? (
            <div className="im-editor__panebody im-editor__scroll">
              <OptionsPanel
                options={project.options}
                onChange={setOptions}
                openGroups={openGroups}
                onToggleGroup={(key: OptionGroupKey, open: boolean) =>
                  setOpenGroups((prev) => ({ ...prev, [key]: open }))
                }
              />
            </div>
          ) : (
            <>
              <button
                type="button"
                className="im-editor__rail"
                onClick={() => setOptionsOpen(true)}
                title={t('editor.expand')}
              >
                {t('editor.options')}
              </button>
              <p className="im-editor__collapsed-hint">{t('editor.collapsedOptions')}</p>
            </>
          )}
        </section>
      </div>

      <ExportDialog
        open={exportOpen}
        project={project}
        onClose={() => setExportOpen(false)}
        onFrame={(t2) => previewRef.current?.seek(t2)}
      />
    </div>
  );
}
