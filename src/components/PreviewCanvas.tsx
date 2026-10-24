import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Button } from '@/components';
import { Scene } from '@/engine';
import { useElementSize, containSize } from '@/lib/useElementSize';
import { registerLiFont } from '@/lib/lishu';
import { resolveFontStack } from '@/lib/fontResolve';
import { useSettingsStore } from '@/store/settings';
import { useT } from '@/lib/useI18n';
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
    const t = useT();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<Scene | null>(null);
    const rafRef = useRef<number>(0);
    const startRef = useRef<number>(0);
    const progressRef = useRef<number>(0);
    const [playing, setPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    // V2-C4 N4.1：字体列表（用于解析 customFontId → 字体栈）。用 ref 避免因列表变化重建场景循环。
    const fonts = useSettingsStore((s) => s.fonts);
    const fontsRef = useRef(fonts);
    useEffect(() => {
      fontsRef.current = fonts;
    }, [fonts]);

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
      // V2-C2：隶书路径按需注册字体（资产缺失时静默跳过）
      if (o.fontFamily === 'li') void registerLiFont().catch(() => undefined);
      // V2-C4 N4.1：解析自定义字体栈（上传字体 / 内置扩展字体）。未选中时为 undefined。
      const customFontStack = resolveFontStack(o.customFontId, fontsRef.current);
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
        outlineAnimation: o.outlineAnimation,
        customFontStack,
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

    // V2-C5 N5.1：预览舞台按画布真实宽高比 + 容器实测空间等比缩放（contain）。
    const o = project.options;
    const ratioW = o.width;
    const ratioH = o.height;
    const [stageWrapRef, avail] = useElementSize<HTMLDivElement>();
    const stage = containSize(avail.width, avail.height, ratioW, ratioH);

    // 缓动重绘：参数变化后场景重建会从 t=0 开始，若期间被暂停/跳转，
    // 画布会停留在首帧——导致"改了参数但看不出变化"的错觉。
    // 这里在场景切换后按真实时间轴持续重绘到结束，保证观感与实测都反映最新参数。
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      let raf = 0;
      const t0 = performance.now();
      const dur = Math.max(1, scene.totalDurationMs);
      const ease = () => {
        const el = performance.now() - t0;
        const tt = Math.min(dur, el);
        draw(tt);
        setProgress(tt / dur);
        if (el < dur) raf = requestAnimationFrame(ease);
        else setPlaying(false);
      };
      raf = requestAnimationFrame(ease);
      return () => cancelAnimationFrame(raf);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id, project.text, project.options]);

    return (
      <div className="im-preview">
        <div className="im-preview__stagewrap" ref={stageWrapRef}>
          <div
            className="im-preview__stage"
            style={
              stage.width > 0
                ? { width: `${stage.width}px`, height: `${stage.height}px` }
                : { aspectRatio: `${ratioW} / ${ratioH}`, maxHeight: '100%' }
            }
            data-ratio={`${ratioW}:${ratioH}`}
          >
            <canvas
              ref={canvasRef}
              className="im-preview__canvas"
              aria-label={t('a11y.previewCanvas')}
            />
          </div>
        </div>
        <div className="im-preview__meta">
          <span className="im-preview__spec">
            {t('preview.specLabel')} {o.width} × {o.height}
          </span>
          <span className="im-preview__ratio">
            {ratioW}:{ratioH}
          </span>
        </div>
        <div className="im-preview__controls">
          <Button variant="secondary" size="sm" onClick={toggle}>
            {playing ? t('preview.pause') : progress >= 1 ? t('preview.replay') : t('preview.play')}
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
