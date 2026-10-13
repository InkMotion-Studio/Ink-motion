// 场景编排：整合排版 + 笔画 + 载体，按时间线逐帧绘制（预览与导出共用）。
import { layoutText } from './layout';
import {
  loadStrokeData,
  drawKaiGlyph,
  drawSongGlyph,
  isBlockedPath,
} from './stroke';
import { renderCarrier } from './carrier';
import type { GlyphPlacement, HanziStrokeData, LayoutResult } from './types';
import type { CarrierType, FontFamily } from '@/db/types';

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
  readonly layout: LayoutResult;
  readonly timings: GlyphTiming[] = [];
  totalDurationMs = 0;
  private readonly data = new Map<string, HanziStrokeData | null>();

  constructor(opts: SceneOptions) {
    this.opts = opts;
    const path: 'kai' | 'song' | 'ancient' =
      opts.fontFamily === 'song' ? 'song' : opts.fontFamily === 'ancient' ? 'ancient' : 'kai';
    this.layout = layoutText({
      text: opts.text,
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
    const chars = Array.from(new Set(this.layout.glyphs.map((g) => g.char))).filter(
      (c) => c.trim().length > 0 && !this.data.has(c),
    );
    await Promise.all(
      chars.map(async (c) => {
        if (!this.data.has(c)) this.data.set(c, await loadStrokeData(c));
      }),
    );
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
