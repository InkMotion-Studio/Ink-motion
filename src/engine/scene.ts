// 场景编排：整合排版 + 笔画 + 载体，按时间线逐帧绘制（预览与导出共用）。
import { layoutText } from './layout';
import { loadStrokeData, drawKaiGlyph, drawSongGlyph, drawSealGlyph, drawLiGlyph, drawGlyphOutline, isBlockedPath } from './stroke';
import { renderCarrier } from './carrier';
import { parseGlyphOutline, type OutlineGlyph } from './outline';
import type { GlyphPlacement, HanziStrokeData, LayoutResult } from './types';
import type { CarrierType, FontFamily } from '@/db/types';
import { loadSealCharset, loadSealRegistry, mergedSealCharset, transformToSeal, type SealLayerSetting, SEAL_FONT_URL } from '@/lib/seal';
import { loadLiCharset, transformToLi, LI_FONT_URL } from '@/lib/lishu';
import { getBuiltinFontStack } from '@/lib/fontRegistry';
import { getSetting } from '@/db/database';

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
  /** V2-C2 N2.3：沿字形轮廓描绘显现（仅 seal/li 路径生效）；缺省关闭 */
  outlineAnimation?: boolean;
  /**
   * V2-C4 N4.1：自定义字体（用户上传/内置扩展）的 CSS 字体栈。
   * 设置后，非受限路径一律以该字体栈整字显现，fontFamily 退居回退与分组依据。
   */
  customFontStack?: string;
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
  /** V2-C2 N2.3：字形轮廓缓存（仅 seal/li 且开启描边时预解析；失败为 null → 降级整字填充） */
  private readonly outlines = new Map<string, OutlineGlyph | null>();

  constructor(opts: SceneOptions) {
    this.opts = opts;
    // V2-C4 N4.1/N4.2：以下三类都走「整字显现」路径（复用 song 排布与计时），仅在绘制时替换字体栈：
    //   · 自定义字体（用户上传 / 内置扩展）
    //   · 内置宋体
    //   · V2-C4 N4.2 新增的毛笔楷（brush，书法体，整字显现无笔顺数据）
    const usesWholeGlyph = !!opts.customFontStack || opts.fontFamily === 'song' || opts.fontFamily === 'brush';
    const path: 'kai' | 'song' | 'seal' | 'li' = usesWholeGlyph
      ? 'song'
      : opts.fontFamily === 'seal'
        ? 'seal'
        : opts.fontFamily === 'li'
          ? 'li'
          : 'kai';
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
      // 读取字源层级设置（读不到时回退 L0 保底，确保 V1.0 行为不被 DB 不可用破坏）
      let setting: SealLayerSetting = 'L0';
      try {
        setting = ((await getSetting<string>('sealLayers', 'L0')) ?? 'L0') as SealLayerSetting;
      } catch {
        setting = 'L0';
      }
      try {
        // V2-C1 N1.1：按设置项读取启用层（L0 保底），加载合并注册表后映射为小篆码位并重排
        const reg = await loadSealRegistry(setting);
        const fallback = await loadSealCharset();
        const cs = reg ? mergedSealCharset(reg) : fallback ?? {
          version: 'none',
          layer: 'L0' as const,
          glyphs: [],
          modernIndex: {},
        };
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
    // V2-C2 N2.2：隶书路径——加载隶书字表后映射码位并重排（字表缺失时恒等映射，不拦截）
    if (this.opts.fontFamily === 'li') {
      try {
        const cs = await loadLiCharset();
        const { renderChars } = transformToLi(this.opts.text, cs);
        const renderText = renderChars.join('');
        if (renderText !== this.layout.glyphs.map((g) => g.char).join('')) {
          this.layout = layoutText({
            text: renderText,
            width: this.opts.width,
            height: this.opts.height,
            fontSize: this.opts.fontSize,
            path: 'li',
          });
        }
      } catch {
        // 隶书字表加载失败：preload 不阻断（字体栈兜底）
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
    // V2-C2 N2.3：轮廓描边动画——仅受限字库路径且开关开启时预解析字形轮廓
    await this.preloadOutlines();
  }

  /**
   * V2-C2 N2.3：预解析受限字库（seal/li）字形轮廓，供描边动画使用。
   * 关闭开关或非受限路径时不做任何解析（零开销）。解析失败静默（缓存 null，绘制时降级整字填充）。
   */
  private async preloadOutlines(): Promise<void> {
    if (!this.opts.outlineAnimation) return;
    const path = this.opts.fontFamily;
    if (path !== 'seal' && path !== 'li') return;
    const fontUrl = path === 'seal' ? SEAL_FONT_URL : LI_FONT_URL;
    const chars = Array.from(new Set(this.layout.glyphs.map((g) => g.char))).filter(
      (c) => c.trim().length > 0 && !this.outlines.has(c),
    );
    const CHUNK = 100;
    for (let i = 0; i < chars.length; i += CHUNK) {
      const batch = chars.slice(i, i + CHUNK);
      await Promise.all(
        batch.map(async (c) => {
          const cp = c.codePointAt(0);
          if (cp === undefined) {
            this.outlines.set(c, null);
            return;
          }
          const o = await parseGlyphOutline(fontUrl, cp);
          if (!o && typeof console !== 'undefined') {
            // 静默降级：非 error 级别，避免污染用户控制台
            console.debug('[inkmotion] outline unavailable, fallback to fill:', c);
          }
          this.outlines.set(c, o);
        }),
      );
      if (i + CHUNK < chars.length) await new Promise((r) => setTimeout(r, 0));
    }
  }

  /** 查询已解析的字形轮廓（无则 null → 调用方降级）。 */
  getGlyphOutline(ch: string): OutlineGlyph | null {
    return this.outlines.get(ch) ?? null;
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
      // V2-C2 N2.3：受限字库路径 + 开关开启 + 轮廓可用 → 沿轮廓描绘；否则回退整字显现
      const useOutline =
        this.opts.outlineAnimation && (g.path === 'seal' || g.path === 'li') && !!this.getGlyphOutline(g.char);
      if (g.path === 'song') {
        // V2-C4 N4.1/N4.2：自定义字体栈优先（用户上传 / 内置扩展），
        // 否则按内置 family 取栈（song=思源宋体，brush=马善政毛笔楷）
        const stack = this.opts.customFontStack ?? getBuiltinFontStack(this.opts.fontFamily);
        drawSongGlyph(ctx, g, p, this.opts.strokeColor, stack);
      } else if (g.path === 'seal') {
        // 古文字：仅渲染小篆码位字符（U+3D000+）；越界字符（仍为现代字符）跳过
        if (g.char.codePointAt(0) !== undefined && g.char.codePointAt(0)! >= 0x3d000) {
          if (useOutline) drawGlyphOutline(ctx, g, this.getGlyphOutline(g.char)!, p, this.opts.strokeColor);
          else drawSealGlyph(ctx, g, p, this.opts.strokeColor);
        }
        // 越界字符：不绘制（IM-TEST-001 §5.2 / TC-V1-GLY-07）
      } else if (g.path === 'li') {
        // V2-C2 N2.2：隶书受限字库整字显现；字表缺失时恒等映射（字符为今字），字体栈兜底
        if (useOutline) drawGlyphOutline(ctx, g, this.getGlyphOutline(g.char)!, p, this.opts.strokeColor);
        else drawLiGlyph(ctx, g, p, this.opts.strokeColor);
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
