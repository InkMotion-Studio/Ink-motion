// 场景编排：整合排版 + 笔画 + 载体，按时间线逐帧绘制（预览与导出共用）。
import { layoutText } from './layout';
import {
  loadStrokeData,
  drawKaiGlyph,
  drawSongGlyph,
  drawSealGlyph,
  isBlockedPath,
} from './stroke';
import { renderCarrier } from './carrier';
import type { GlyphPlacement, HanziStrokeData, LayoutResult } from './types';
import type { CarrierType, FontFamily } from '@/db/types';
import { loadSealCharset, transformToSeal } from '@/lib/seal';

export interface SceneOptions {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  carrier: CarrierType;
  fontFamily: FontFamily;
  strokeColor: string;
  backgroundColor: string;
  writingSpeed: number;
  scrollEnabled: boolean;
}

const PER_STROKE_MS = 110; // 每笔画书写时长（受 writingSpeed 缩放）
const WHOLE_MS = 220; // 宋体整字显现时长

interface GlyphTiming {
  glyph: GlyphPlacement;
  start: number;
  dur: number;
}

export class Scene {
  readonly opts: SceneOptions;
  layout: LayoutResult;
  readonly timings: GlyphTiming[] = [];
  totalDurationMs = 0;
  private readonly data = new Map<string, HanziStrokeData | null>();

  constructor(opts: SceneOptions) {
    this.opts = opts;
    const path: 'kai' | 'song' | 'seal' =
      opts.fontFamily === 'song' ? 'song' : opts.fontFamily === 'seal' ? 'seal' : 'kai';
    // 古文字路径：构造期先以原文本排版；preload 中加载字表后再映射为小篆码位并重排
    const renderText = opts.text;
    this.layout = layoutText({
      text: renderText,
      width: opts.width,
      height: opts.height,
      fontSize: opts.fontSize,
      path,
    });
    const ordered = [...this.layout.glyphs].sort((a, b) => a.order - b.order);
    this.buildTimings(ordered);
  }

  private buildTimings(ordered: GlyphPlacement[]): void {
    this.timings.length = 0;
    let t = 0;
    const speed = Math.max(0.25, this.opts.writingSpeed);
    for (const g of ordered) {
      const dur = g.isPunct
        ? WHOLE_MS * 0.5
        : g.path === 'song'
          ? WHOLE_MS / speed
          : (g.strokeCount * PER_STROKE_MS) / speed;
      this.timings.push({ glyph: g, start: t, dur });
      t += dur;
    }
    // 末尾留白
    this.totalDurationMs = t + 600;
  }

  /** 预加载楷体笔画数据（缺失字将被标记为降级，绘制时走整字）。 */
  async preload(): Promise<void> {
    // 古文字路径：确保字表已加载后，将今字映射为小篆码位并重排（避免构造期字表未就绪）
    if (this.opts.fontFamily === 'seal') {
      try {
        const cs = await loadSealCharset();
        const { renderChars } = transformToSeal(this.opts.text, cs);
        const renderText = renderChars.join('');
        if (renderText !== this.layout.glyphs.map((g) => g.char).join('')) {
          // 重新排版（使用映射后的小篆码位字符）
          this.layout = layoutText({
            text: renderText,
            width: this.opts.width,
            height: this.opts.height,
            fontSize: this.opts.fontSize,
            path: 'seal',
          });
        }
      } catch {
        // 字表加载失败：preload 不阻断，绘制层会按越界处理
      }
    }
    const chars = Array.from(new Set(this.layout.glyphs.map((g) => g.char))).filter(
      (c) => c.trim().length > 0 && !this.data.has(c),
    );
    // V1-C4 N4.3：长文分块预加载——每 200 字让出主线程，避免 5000 字时冻结 UI
    const CHUNK = 200;
    for (let i = 0; i < chars.length; i += CHUNK) {
      const batch = chars.slice(i, i + CHUNK);
      await Promise.all(
        batch.map(async (c) => {
          if (!this.data.has(c)) this.data.set(c, await loadStrokeData(c));
        }),
      );
      // 让出主线程（最后一批无需让出）
      if (i + CHUNK < chars.length) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    // 用真实笔画数更新计时线（缺失字保持估计值并走整字降级）
    for (const g of this.layout.glyphs) {
      const d = this.data.get(g.char);
      if (d && d.medians.length > 0) g.strokeCount = d.medians.length;
    }
    const ordered = [...this.layout.glyphs].sort((a, b) => a.order - b.order);
    this.buildTimings(ordered);
  }

  getGlyphData(ch: string): HanziStrokeData | null {
    return this.data.get(ch) ?? null;
  }

  /** 生成缩略图 dataURL（等比缩小，用于项目卡片）。环境不支持 canvas 时返回 null。 */
  snapshot(t = 0, maxWidth = 270): string | null {
    if (typeof document === 'undefined') return null;
    const src = document.createElement('canvas');
    src.width = this.opts.width;
    src.height = this.opts.height;
    const sctx = src.getContext('2d');
    if (!sctx) return null; // 无 canvas 2D 支持（如 jsdom / 隐私模式）
    this.drawFrame(sctx, t);
    const scale = Math.min(1, maxWidth / this.opts.width);
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(this.opts.width * scale));
    out.height = Math.max(1, Math.round(this.opts.height * scale));
    const octx = out.getContext('2d');
    if (!octx) return null;
    octx.drawImage(src, 0, 0, out.width, out.height);
    try {
      return out.toDataURL('image/jpeg', 0.7);
    } catch {
      return null;
    }
  }

  /**
   * 竖排滚动：内容自右向左排布，书写头位于最右列时可视；当总列宽超过画布宽，
   * 随书写推进向左平移，保持当前书写列可见。返回 [dx, dy]。
   */
  private scrollOffset(t: number): { dx: number; dy: number } {
    if (!this.opts.scrollEnabled) return { dx: 0, dy: 0 };
    const maxDx = Math.max(0, this.layout.contentWidth - this.opts.width);
    const maxDy = Math.max(0, this.layout.contentHeight - this.opts.height);
    if (maxDx === 0 && maxDy === 0) return { dx: 0, dy: 0 };
    // 书写头 = start <= t 的最后一个字符
    let head: GlyphTiming | undefined;
    for (const tm of this.timings) if (tm.start <= t) head = tm;
    const cx = head ? head.glyph.x + head.glyph.size / 2 : this.opts.width / 2;
    const cy = head ? head.glyph.y + head.glyph.size / 2 : this.opts.height / 2;
    // 目标：让书写头居中；向左推进为负 dx
    const targetDx = cx - this.opts.width * 0.55;
    const targetDy = cy - this.opts.height * 0.5;
    const dx = Math.max(0, Math.min(maxDx, targetDx));
    const dy = Math.max(0, Math.min(maxDy, targetDy));
    return { dx, dy };
  }

  drawFrame(ctx: CanvasRenderingContext2D, t: number): void {
    const { width, height, carrier, backgroundColor } = this.opts;
    renderCarrier(ctx, carrier, width, height, { backgroundColor });

    const { dx, dy } = this.scrollOffset(t);
    ctx.save();
    ctx.translate(-dx, -dy);
    for (const tm of this.timings) {
      const local = (t - tm.start) / tm.dur;
      if (local <= 0) continue;
      const g = tm.glyph;
      if (g.char.trim().length === 0 || isBlockedPath(g.path)) continue;
      const p = Math.min(1, local);
      if (g.path === 'song') {
        drawSongGlyph(ctx, g, p, this.opts.strokeColor);
      } else if (g.path === 'seal') {
        // 古文字：仅渲染小篆码位字符（U+3D000+）；越界字符（仍为现代字符）跳过
        if (g.char.codePointAt(0) !== undefined && g.char.codePointAt(0)! >= 0x3d000) {
          drawSealGlyph(ctx, g, p, this.opts.strokeColor);
        }
        // 越界字符：不绘制（IM-TEST-001 §5.2 / TC-V1-GLY-07）
      } else {
        // 楷体：有数据则精确逐笔，否则整字降级
        const data = this.getGlyphData(g.char);
        if (data) drawKaiGlyph(ctx, g, data, p, this.opts.strokeColor);
        else drawSongGlyph(ctx, g, p, this.opts.strokeColor);
      }
    }
    ctx.restore();
  }
}
