import { useEffect, useRef, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * 观测元素内容盒尺寸（ResizeObserver）。
 *
 * V2-C5 N5.1：用于**预览区按容器实际可用空间等比缩放**。
 * 此前预览舞台写死 `aspect-ratio: 9/16` + `max-width: 360px`，
 * 导致：① 横屏 16:9 画布被强行塞进竖屏框；② 大屏下预览过小、留白浪费。
 * 现在由容器实测尺寸驱动 stage 计算。
 *
 * 用 `useLayoutEffect`（SSR 下退化为 `useEffect`）保证首帧测量与绘制同步，避免闪跳。
 */
export function useElementSize<T extends HTMLElement>(): [
  React.RefObject<T>,
  ElementSize,
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const box = e.contentRect;
        setSize((prev) =>
          Math.abs(prev.width - box.width) < 0.5 && Math.abs(prev.height - box.height) < 0.5
            ? prev
            : { width: box.width, height: box.height },
        );
      }
    });
    ro.observe(el);
    // 首次同步测量一次，避免等下一帧
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}

/** 在可用空间内按给定宽高比等比内接（contain）的尺寸计算。 */
export function containSize(
  availW: number,
  availH: number,
  ratioW: number,
  ratioH: number,
): ElementSize {
  if (availW <= 0 || availH <= 0 || ratioW <= 0 || ratioH <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(availW / ratioW, availH / ratioH);
  return { width: Math.floor(ratioW * scale), height: Math.floor(ratioH * scale) };
}
