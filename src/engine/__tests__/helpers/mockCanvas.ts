// V2-C7 C6：Canvas 2D 测试替身（共享）
//
// 背景：C6 载体材质由「单层色块」升级为「多层合成」，用到了 quadraticCurveTo / rect /
// clip / ellipse / arc / createRadialGradient / createPattern 等此前 mock 未覆盖的 API。
// 各处测试各自维护 mock 会持续漏项，故抽出统一工厂。
//
// 特点：
//   · 覆盖载体与字形绘制所需的全部 Canvas2D 方法；
//   · 记录每个绘制方法的调用次数，便于断言「非单层色块」；
//   · 记录 fillRect / strokeRect / fillText 的参数，供既有断言复用。

import { vi } from 'vitest';

export interface MockCanvasCtx {
  ctx: CanvasRenderingContext2D;
  /** 各绘制方法调用次数（仅记录被调用过的方法） */
  counts: Record<string, number>;
  /** fillRect / strokeRect / fillText / drawImage 的实参记录 */
  calls: Record<string, unknown[][]>;
  /** fillText 的 vi spy（供 toHaveBeenCalled* 断言） */
  fillTextSpy: ReturnType<typeof vi.fn>;
  strokeRectSpy: ReturnType<typeof vi.fn>;
  /** 所有渐变 addColorStop 记录的颜色字符串（有区分度，供参数生效/确定性比对） */
  gradients: string[];
  /** 所有 fillStyle / strokeStyle 赋值记录（含底色、纸纹色，供参数生效比对） */
  styles: string[];
}

/** 创建 Canvas 2D 替身（调用计数 + 参数记录 + fillText/strokeRect spy）。 */
export function createMockCtx(): MockCanvasCtx {
  const counts: Record<string, number> = {};
  const calls: Record<string, unknown[][]> = {
    fillRect: [],
    strokeRect: [],
    fillText: [],
    drawImage: [],
  };
  const gradients: string[] = [];
  const styles: string[] = [];
  const track = (op: string, record = false) =>
    (...a: unknown[]) => {
      counts[op] = (counts[op] ?? 0) + 1;
      if (record) calls[op]?.push(a);
    };
  const grad = {
    addColorStop: (_offset: number, color: string) => {
      gradients.push(color);
    },
  };

  // spy 同时记录到 counts/calls，保证两条断言路径一致
  const fillTextSpy = vi.fn();
  const strokeRectSpy = vi.fn();
  const fillText = (...a: unknown[]) => {
    counts.fillText = (counts.fillText ?? 0) + 1;
    calls.fillText.push(a);
    fillTextSpy(...a);
  };
  const strokeRect = (...a: unknown[]) => {
    counts.strokeRect = (counts.strokeRect ?? 0) + 1;
    calls.strokeRect.push(a);
    strokeRectSpy(...a);
  };

  // fillStyle / strokeStyle 用存取器记录赋值（底色/纸纹色属于字符串，可比较）
  let fillStyleValue: unknown = '';
  let strokeStyleValue: unknown = '';
  const ctx = {
    // 属性
    get fillStyle() {
      return fillStyleValue;
    },
    set fillStyle(v: unknown) {
      fillStyleValue = v;
      if (typeof v === 'string') styles.push(v);
    },
    get strokeStyle() {
      return strokeStyleValue;
    },
    set strokeStyle(v: unknown) {
      strokeStyleValue = v;
      if (typeof v === 'string') styles.push(v);
    },
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
    font: '',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    // 状态
    save: track('save'),
    restore: track('restore'),
    // 变换
    translate: track('translate'),
    scale: track('scale'),
    rotate: track('rotate'),
    setTransform: track('setTransform'),
    // 路径
    beginPath: track('beginPath'),
    closePath: track('closePath'),
    moveTo: track('moveTo'),
    lineTo: track('lineTo'),
    quadraticCurveTo: track('quadraticCurveTo'),
    bezierCurveTo: track('bezierCurveTo'),
    arc: track('arc'),
    arcTo: track('arcTo'),
    ellipse: track('ellipse'),
    rect: track('rect'),
    roundRect: track('roundRect'),
    clip: track('clip'),
    // 绘制
    stroke: track('stroke'),
    fill: track('fill'),
    fillRect: track('fillRect', true),
    strokeRect,
    clearRect: track('clearRect'),
    fillText,
    strokeText: track('strokeText'),
    drawImage: track('drawImage', true),
    // 渐变与图案
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createConicGradient: () => grad,
    createPattern: () => null,
    // 像素（导出相关）
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: track('putImageData'),
    // 度量
    measureText: () => ({ width: 0 }),
  } as unknown as CanvasRenderingContext2D;

  return { ctx, counts, calls, fillTextSpy, strokeRectSpy, gradients, styles };
}

/** 仅需 vi.fn 断言风格的场景（如 fillText 调用次数）。 */
export function createSpyCtx(): CanvasRenderingContext2D & {
  fillText: ReturnType<typeof vi.fn>;
} {
  const { ctx } = createMockCtx();
  (ctx as unknown as { fillText: unknown }).fillText = vi.fn();
  return ctx as CanvasRenderingContext2D & { fillText: ReturnType<typeof vi.fn> };
}
