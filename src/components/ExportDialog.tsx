import { useEffect, useRef, useState } from 'react';
import { Button, Modal, toast } from '@/components';
import { detectCapabilities, exportVideo, ExportAbortError, type ExportCapabilities } from '@/engine';
import { projectToScene } from '@/lib/sceneFactory';
import { planPerformance, subsetAdvice } from '@/lib/perf';
import { putExport } from '@/db/database';
import { useT } from '@/lib/useI18n';
import type { Project } from '@/db/types';

interface ExportDialogProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  /** 导出过程中逐帧回调（ms），用于同步预览画布 */
  onFrame?: (t: number) => void;
}

interface ExportState {
  status: 'idle' | 'running' | 'done' | 'error';
  progress: number;
  format?: 'webm' | 'mp4';
  sizeBytes?: number;
  url?: string;
  message?: string;
}

export function ExportDialog({ open, project, onClose, onFrame }: ExportDialogProps) {
  const t = useT();
  const [caps, setCaps] = useState<ExportCapabilities | null>(null);
  const [state, setState] = useState<ExportState>({ status: 'idle', progress: 0 });
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      setCaps(detectCapabilities());
      setState({ status: 'idle', progress: 0 });
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort(); // 关闭对话框时中止进行中的导出
    };
  }, []);

  const run = async () => {
    const o = project.options;
    const canvasSpec = { width: o.width, height: o.height };
    const plan = planPerformance(Array.from(project.text).length, o.framerate, canvasSpec);
    const canvas = document.createElement('canvas');
    canvas.width = o.width;
    canvas.height = o.height;
    const scene = projectToScene(project);
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'running', progress: 0 });
    try {
      await scene.preload();
      const result = await exportVideo({
        canvas,
        fps: plan.framerate,
        durationMs: scene.totalDurationMs,
        render: (ctx, t) => {
          scene.drawFrame(ctx, t);
          onFrame?.(t);
        },
        preferMp4: caps?.recommended === 'mp4',
        onProgress: (p) => setState((s) => ({ ...s, progress: p })),
        signal: controller.signal, // V1-C3 N3.4：支持取消
      });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(result.blob);
      urlRef.current = url;
      setState({
        status: 'done',
        progress: 1,
        format: result.format,
        sizeBytes: result.sizeBytes,
        url,
      });
      await putExport({
        projectId: project.id,
        format: result.format,
        sizeBytes: result.sizeBytes,
        durationMs: result.durationMs,
      });
      toast.success(t('export.done', { format: result.format.toUpperCase() }));
    } catch (e) {
      const isAbort = e instanceof ExportAbortError || (e as Error).name === 'AbortError';
      setState({
        status: 'error',
        progress: 0,
        message: isAbort ? t('export.cancelledToast') : (e as Error).message,
      });
      if (isAbort) toast.success(t('export.cancelledToast'));
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  const fmtSize = (n?: number) => (n ? `${(n / 1024 / 1024).toFixed(2)} MB` : '—');

  return (
    <Modal
      open={open}
      title={t('export.title')}
      onClose={onClose}
      footer={
        state.status === 'done' ? (
          <Button variant="primary" onClick={onClose}>
            {t('export.doneBtn')}
          </Button>
        ) : state.status === 'running' ? (
          <>
            <Button variant="ghost" onClick={cancel}>
              {t('export.cancelExport')}
            </Button>
            <Button variant="primary" loading disabled>
              {t('export.exporting')}
            </Button>
          </>
        ) : state.status === 'error' ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('export.close')}
            </Button>
            <Button variant="primary" onClick={run}>
              {t('export.retryBtn')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('export.cancelBtn')}
            </Button>
            <Button variant="primary" onClick={run}>
              {t('export.start')}
            </Button>
          </>
        )
      }
    >
      {caps && (
        <div style={{ marginBottom: 'var(--im-space-4)' }}>
          <p style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-soft)' }}>
            {t('export.recommendFormat')}<strong>{caps.recommended.toUpperCase()}</strong>
            {t('export.capNote')}
          </p>
          <p style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-ink-faint)' }}>
            {t('export.capWebm')}{caps.webm ? t('export.available') : t('export.unavailable')} · {t('export.capMp4')}
            {caps.webcodecsMp4 ? t('export.available') : t('export.unavailable')}
          </p>
          {(() => {
            const plan = planPerformance(
              Array.from(project.text).length,
              project.options.framerate,
              { width: project.options.width, height: project.options.height },
            );
            const advice = subsetAdvice(new Set(Array.from(project.text)).size);
            return (
              <>
                {plan.note && (
                  <p style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-warning)' }}>
                    {plan.note}
                    {t('export.framerateSuffix', { fps: plan.framerate })}
                  </p>
                )}
                {advice && (
                  <p style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-ink-faint)' }}>
                    {advice}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {state.status === 'running' && (
        <div className="im-export-progress">
          <div className="im-preview__bar" style={{ height: 10 }}>
            <div className="im-preview__fill" style={{ width: `${Math.round(state.progress * 100)}%` }} />
          </div>
          <p style={{ fontSize: 'var(--im-fs-sm)', marginTop: 8 }}>
            {t('export.progress', { p: Math.round(state.progress * 100) })}
          </p>
        </div>
      )}

      {state.status === 'done' && (
        <div>
          <p style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-success)' }}>
            {t('export.success', { format: state.format?.toUpperCase() ?? '', size: fmtSize(state.sizeBytes) })}
          </p>
          {state.url && (
            <a
              className="im-btn im-btn--primary im-btn--md"
              href={state.url}
              download={`inkmotion-${project.title || t('export.defaultTitle')}.${state.format}`}
              style={{ display: 'inline-flex', marginTop: 12, textDecoration: 'none' }}
            >
              {t('export.download')}
            </a>
          )}
        </div>
      )}

      {state.status === 'error' && (
        <p style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-danger)' }}>
          {t('export.fail', { msg: state.message ?? '' })}
        </p>
      )}
    </Modal>
  );
}
