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
    const playingRef = useRef(true);
    /** 播放循环代际令牌：每次 playLoop 自增，旧 loop 检测到令牌不符即退出，避免旧文本短动画 setPlaying(false) 误杀新动画。 */
    const playGenRef = useRef(0);
    const [progress, setProgress] = useState(0);
    // V2-C7 C7 BUG-006：长文预加载进度（0–1）；null 表示未在准备。仅长文时显示。
    const [prep, setPrep] = useState<number | null>(null);

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

    // 同步 playing 状态到 ref，供 playLoop 同步读取。
    // 注意：此处不再 clearRaf——循环的启停统一由 playLoop 的代际令牌(gen)与 playingRef 控制，
    // 避免在旧文本短动画「自然结束」setPlaying(false) 时误杀新文本正在播放的 loop（gen 已更新）。
    // 暂停/恢复由 toggle 直接驱动 playLoop；组件卸载/场景重建由构建 effect 的 cleanup 负责 clearRaf。
    useEffect(() => {
      playingRef.current = playing;
    }, [playing]);

    /**
     * 在预加载完成后的场景上启动逐帧播放循环。
     * 统一由「构建场景 effect（preload.then）」「重播按钮」「restart」三处调用，
     * 保证始终基于修正后的 totalDurationMs 推进。
     */
    const playLoop = (scene: Scene, fromProgress = 0) => {
      // 强制置为播放态：新一次播放（重播 / 重建场景 / 续播）应无条件接管，
      // 避免旧文本短动画先 setPlaying(false) 把 playingRef 置否后误杀本次播放。
      playingRef.current = true;
      // 构建场景 effect 在 preload 完成后调用本函数重新播放。
      // 使用代际令牌，确保旧文本动画（可能用短 totalDurationMs 先跑完并 setPlaying(false)）不会误杀本次播放。
      const gen = ++playGenRef.current;
      clearRaf();
      startRef.current = performance.now() - fromProgress * scene.totalDurationMs;
      const loop = () => {
        try {
          if (playGenRef.current !== gen) return; // 已被更新的播放取代
          if (!playingRef.current) return; // 用户暂停
          const elapsed = performance.now() - startRef.current;
          const t = Math.min(scene.totalDurationMs, elapsed);
          draw(t);
          setP(t / scene.totalDurationMs);
          if (elapsed < scene.totalDurationMs) {
            rafRef.current = requestAnimationFrame(loop);
          } else {
            setPlaying(false);
          }
        } catch (e) {
          // 单帧异常不应中断整条播放循环；静默吞掉并继续下一帧
          void e;
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    };

    // 构建场景（文本 / 参数变化时重建），并在预加载完成后启动播放循环。
    //
    // 关键修复：播放循环必须在 scene.preload() 完成后再启动，否则会用 preload 之前的
    // （过短 / 未修正的）totalDurationMs 推进，导致动画在数百毫秒内"播完即停"甚至永不推进。
    // 因此把「构建 + 预加载 + 启动循环」收敛到同一 effect，preload 完成后才请求rAF。
    useEffect(() => {
      const o = project.options;
      clearRaf();
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
        // V2-C7 C6：载体观感参数（色温 / 做旧 / 装裱边 / 钤印位）
        warmth: o.warmth,
        aging: o.aging,
        mountRatio: o.mountRatio,
        sealPos: o.sealPos,
        // V2-C7 C7 BUG-006：长文预加载进度
        onProgress: (loaded, total) => {
          setPrep(total > 0 ? loaded / total : null);
        },
      });
      sceneRef.current = scene;
      const canvas = canvasRef.current!;
      canvas.width = o.width;
      canvas.height = o.height;
      setP(0);
      setPlaying(true);
      playingRef.current = true;
      setPrep(null);
      startRef.current = performance.now();

      let cancelled = false;
      scene
        .preload()
        .then(() => {
          if (cancelled) return;
          setPrep(null);
          draw(0);
          const snap = scene.snapshot(0);
          if (snap) onSnapshot?.(snap);
          // 预加载完成后，基于「修正后的」totalDurationMs 启动播放循环。
          // 此处无条件启动：构建 effect 已通过 setPlaying(true)+playingRef=true 表达"应播放"，
          // 即便此前旧文本短动画把 playingRef 临时置否，本次也应重新接管（由 playLoop 内部强制置真）。
          playLoop(scene);
        })
        .catch(() => {
          if (!cancelled) setPrep(null);
        });
      return () => {
        cancelled = true;
        clearRaf();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id, project.text, project.options]);

    // 播放循环已并入「构建场景」effect 内，在 preload 完成后启动，避免用过短时长的空跑。

    useImperativeHandle(ref, () => ({
      seek: (t) => {
        setP(sceneRef.current ? t / sceneRef.current.totalDurationMs : 0);
        draw(t);
      },
      pause: () => setPlaying(false),
      restart: () => {
        const scene = sceneRef.current;
        if (!scene) return;
        setP(0);
        setPlaying(true);
        playingRef.current = true;
        playLoop(scene, 0);
      },
      snapshot: (t = 0) => sceneRef.current?.snapshot(t) ?? null,
      durationMs: () => sceneRef.current?.totalDurationMs ?? 0,
    }));

    const toggle = () => {
      if (progress >= 1) {
        // 重播：从头开始
        const scene = sceneRef.current;
        if (scene) {
          setP(0);
          setPlaying(true);
          playingRef.current = true;
          playLoop(scene, 0);
        }
        return;
      }
      if (playing) {
        setPlaying(false);
      } else {
        // 从当前进度续播
        const scene = sceneRef.current;
        if (scene) {
          setPlaying(true);
          playingRef.current = true;
          playLoop(scene, progressRef.current);
        }
      }
    };

    // V2-C5 N5.1：预览舞台按画布真实宽高比 + 容器实测空间等比缩放（contain）。
    const o = project.options;
    const ratioW = o.width;
    const ratioH = o.height;
    const [stageWrapRef, avail] = useElementSize<HTMLDivElement>();
    const stage = containSize(avail.width, avail.height, ratioW, ratioH);

    // V2-C7 C7 BUG-001 修复：移除与「播放循环」并存的第二条 rAF「缓动重绘」链。
    // 该链此前不依赖 playing，暂停后仍推进 progressRef，导致「按钮变播放但进度照走」。
    // 现在唯一动画驱动源是上面的「播放循环」（依赖 playing），参数变化时其依赖
    // project.options/text 变化会自然重跑并重播，观感仍能反映最新参数。

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
            {prep !== null && prep < 1 && (
              <div className="im-preview__prep" role="status" aria-live="polite">
                {t('preview.preparing')} {Math.round(prep * 100)}%
              </div>
            )}
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
