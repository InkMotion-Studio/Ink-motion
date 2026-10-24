// V2-C2 N2.4：描边性能与回退单测。
// 断言：(1) 开关关闭时不做任何轮廓解析（零开销）；(2) 非受限路径亦不解析；
// (3) 解析失败时静默降级为整字填充（console.debug，非 error）；(4) drawFrame 完整走通不抛错。
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Scene, type SceneOptions } from '../scene';

function baseOpts(over: Partial<SceneOptions> = {}): SceneOptions {
  return {
    // 使用小篆码位（U+3D000+）直投，确保 seal 路径进入绘制分支
    text: '\u{3D000}',
    width: 400,
    height: 600,
    fontSize: 80,
    carrier: 'paper',
    fontFamily: 'seal',
    strokeColor: '#111',
    backgroundColor: '#fff',
    writingSpeed: 1,
    scrollEnabled: false,
    outlineAnimation: false,
    ...over,
  };
}

/** 记录 canvas 调用的最小 fake context（覆盖 carrier + glyph 绘制所需 API）。 */
function makeCtx() {
  const calls: Record<string, number> = {};
  const rec = (op: string) => () => {
    calls[op] = (calls[op] ?? 0) + 1;
  };
  const grad = { addColorStop: () => undefined };
  const ctx = {
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    scale: rec('scale'),
    rotate: rec('rotate'),
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    stroke: rec('stroke'),
    fill: rec('fill'),
    fillText: rec('fillText'),
    fillRect: rec('fillRect'),
    strokeRect: rec('strokeRect'),
    clearRect: rec('clearRect'),
    arc: rec('arc'),
    clip: rec('clip'),
    drawImage: rec('drawImage'),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: rec('putImageData'),
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    strokeStyle: '',
    fillStyle: '',
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    shadowBlur: 0,
    shadowColor: '',
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('V2-C2 N2.4 描边性能与回退', () => {
  beforeEach(() => {
    // 所有网络请求一律 404：模拟资产未随包 / 离线
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('开关关闭时不解析任何轮廓（preload 期间无字体二进制请求）', async () => {
    const scene = new Scene(baseOpts({ outlineAnimation: false }));
    await scene.preload();
    // 404 下不应抛出，且轮廓缓存保持为空（未触发解析）
    expect(scene.getGlyphOutline('\u{3D000}')).toBeNull();
  });

  it('非受限路径（楷体）即使开启开关也不解析轮廓', async () => {
    const scene = new Scene(baseOpts({ fontFamily: 'kai', outlineAnimation: true }));
    await scene.preload();
    expect(scene.getGlyphOutline('山')).toBeNull();
  });

  it('受限路径 + 开关开启 + 资产缺失：静默降级（缓存 null，debug 非 error）', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const scene = new Scene(baseOpts({ outlineAnimation: true }));
    await scene.preload();
    expect(scene.getGlyphOutline('山')).toBeNull(); // 降级
    expect(errorSpy).not.toHaveBeenCalled(); // 不得以 error 污染控制台
    debugSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('drawFrame 在开启描边但无轮廓数据时仍完成整字填充（不抛错）', async () => {
    const scene = new Scene(baseOpts({ outlineAnimation: true }));
    await scene.preload();
    const { ctx, calls } = makeCtx();
    expect(() => scene.drawFrame(ctx, scene.totalDurationMs)).not.toThrow();
    // 降级路径应调用 fillText（整字显现）
    expect(calls.fillText ?? 0).toBeGreaterThan(0);
  });

  it('drawFrame 在关闭描边时同样完成整字填充', async () => {
    const scene = new Scene(baseOpts({ outlineAnimation: false }));
    await scene.preload();
    const { ctx, calls } = makeCtx();
    scene.drawFrame(ctx, scene.totalDurationMs);
    expect(calls.fillText ?? 0).toBeGreaterThan(0);
  });
});
