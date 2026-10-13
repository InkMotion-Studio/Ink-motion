import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components';
import { Scene } from '@/engine';
import type { Project } from '@/db/types';

export interface PreviewHandle {
  /** 在指定时间点渲染一帧（用于导出联动） */
  seek: (t: number) => void;
  /** 暂停播放 */
  pause: () => void;
  /** 从头重播 */
  restart: () => void;
  /** 生成缩略图 dataURL */
  snapshot: (t?: number) => string | null;
  /** 场景总时长（ms） */
  durationMs: () => number;
}

interface PreviewCanvasProps {
  project: Project;
  /** 场景就绪或参数变化后回调缩略图（用于项目卡片） */
  onSnapshot?: (dataUrl: string) => void;
}

export const PreviewCanvas = forwardRef<PreviewHandle, PreviewCanvasProps>(
  function PreviewCanvas({ project, onSnapshot }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<Scene | null>(null);
    const rafRef = useRef<number>(0);
    const startRef = useRef<number>(0);
    const progressRef = useRef<number>(0);
    const [playing, setPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    const clearRaf = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    const draw = (t: number) => {
      const scene = sceneRef.current;
      const canvas = canvasRef.current;
      if (!scene || !canvas) return;
      scene.drawFrame(canvas.getContext('2d')!, t);
    };

    const setP = (v: number) => {
      progressRef.current = v;
      setProgress(v);
    };

    // 构建场景（文本 / 参数变化时重建）
    useEffect(() => {
      clearRaf();
      const o = project.options;
      const scene = new Scene({
        text: project.text,
        width: o.width,
        height: o.height,
        fontSize: o.fontSize,
        carrier: o.carrier,
        fontFamily: o.fontFamily,
        strokeColor: o.strokeColor,
        backgroundColor: o.backgroundColor,
        writingSpeed: o.writingSpeed,
        scrollEnabled: o.scrollEnabled,
      });
      sceneRef.current = scene;
      const canvas = canvasRef.current!;
      canvas.width = o.width;
      canvas.height = o.height;
      setP(0);
      setPlaying(true);
      startRef.current = performance.now();
      scene.preload().finally(() => {
        draw(0);
        const snap = scene.snapshot(0);
        if (snap) onSnapshot?.(snap);
      });
      return clearRaf;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id, project.text, project.options]);

    // 播放循环
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      clearRaf();
      if (!playing) return;
      startRef.current = performance.now() - progressRef.current * scene.totalDurationMs;
      const loop = () => {
        const elapsed = performance.now() - startRef.current;
        const t = Math.min(scene.totalDurationMs, elapsed);
        draw(t);
        setP(t / scene.totalDurationMs);
        if (elapsed < scene.totalDurationMs) {
          rafRef.current = requestAnimationFrame(loop);
        } else {
          setPlaying(false);
        }
      };
      rafRef.current = requestAnimationFrame(loop);
      return clearRaf;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playing, project.options, project.text]);

    useImperativeHandle(ref, () => ({
      seek: (t) => {
        setP(sceneRef.current ? t / sceneRef.current.totalDurationMs : 0);
        draw(t);
      },
      pause: () => setPlaying(false),
      restart: () => {
        startRef.current = performance.now();
        setP(0);
        setPlaying(true);
      },
      snapshot: (t = 0) => sceneRef.current?.snapshot(t) ?? null,
      durationMs: () => sceneRef.current?.totalDurationMs ?? 0,
    }));

    const toggle = () => {
      if (progress >= 1) {
        startRef.current = performance.now();
        setP(0);
        setPlaying(true);
        return;
      }
      setPlaying((p) => !p);
    };

    return (
      <div className="im-preview">
        <div className="im-preview__stage" style={{ aspectRatio: '9 / 16' }}>
          <canvas ref={canvasRef} className="im-preview__canvas" aria-label="书写动画预览" />
        </div>
        <div className="im-preview__controls">
          <Button variant="secondary" size="sm" onClick={toggle}>
            {playing ? '暂停' : progress >= 1 ? '重播' : '播放'}
          </Button>
          <div className="im-preview__bar">
            <div className="im-preview__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="im-preview__pct">{Math.round(progress * 100)}%</span>
        </div>
      </div>
    );
  },
);
