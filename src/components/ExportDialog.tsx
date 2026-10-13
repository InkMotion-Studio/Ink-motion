import { useEffect, useRef, useState } from 'react';
import { Button, Modal, toast } from '@/components';
import { detectCapabilities, exportVideo, type ExportCapabilities } from '@/engine';
import { projectToScene } from '@/lib/sceneFactory';
import { planPerformance, subsetAdvice } from '@/lib/perf';
import { putExport } from '@/db/database';
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

  const run = async () => {
    const o = project.options;
    const plan = planPerformance(Array.from(project.text).length, o.framerate);
    const canvas = document.createElement('canvas');
    canvas.width = o.width;
    canvas.height = o.height;
    const scene = projectToScene(project);
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
      toast.success(`导出完成（${result.format.toUpperCase()}）`);
    } catch (e) {
      setState({ status: 'error', progress: 0, message: (e as Error).message });
    }
  };

  const fmtSize = (n?: number) => (n ? `${(n / 1024 / 1024).toFixed(2)} MB` : '—');

  return (
    <Modal
      open={open}
      title="导出视频"
      onClose={onClose}
      footer={
        state.status === 'done' ? (
          <Button variant="primary" onClick={onClose}>
            完成
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button variant="primary" onClick={run} loading={state.status === 'running'} disabled={state.status === 'running'}>
              开始导出
            </Button>
          </>
        )
      }
    >
      {caps && (
        <div style={{ marginBottom: 'var(--im-space-4)' }}>
          <p style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-ink-soft)' }}>
            推荐格式：<strong>{caps.recommended.toUpperCase()}</strong>
            （WebM 保底 / MP4 增强，自动降级）
          </p>
          <p style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-ink-faint)' }}>
            WebM（MediaRecorder）：{caps.webm ? '可用' : '不可用'} · WebCodecs MP4：
            {caps.webcodecsMp4 ? '可用' : '不可用'}
          </p>
          {(() => {
            const plan = planPerformance(Array.from(project.text).length, project.options.framerate);
            const advice = subsetAdvice(new Set(Array.from(project.text)).size);
            return (
              <>
                {plan.note && (
                  <p style={{ fontSize: 'var(--im-fs-xs)', color: 'var(--im-color-warning)' }}>
                    {plan.note}（导出帧率 {plan.framerate} fps）
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
            导出中… {Math.round(state.progress * 100)}%
          </p>
        </div>
      )}

      {state.status === 'done' && (
        <div>
          <p style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-success)' }}>
            导出成功：{state.format?.toUpperCase()} · {fmtSize(state.sizeBytes)}
          </p>
          {state.url && (
            <a
              className="im-btn im-btn--primary im-btn--md"
              href={state.url}
              download={`inkmotion-${project.title || '作品'}.${state.format}`}
              style={{ display: 'inline-flex', marginTop: 12, textDecoration: 'none' }}
            >
              下载视频
            </a>
          )}
        </div>
      )}

      {state.status === 'error' && (
        <p style={{ fontSize: 'var(--im-fs-sm)', color: 'var(--im-color-danger)' }}>
          导出失败：{state.message}
        </p>
      )}
    </Modal>
  );
}
