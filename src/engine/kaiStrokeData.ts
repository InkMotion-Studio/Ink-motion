// KaiAdaptor：从本地打包的 hanzi-writer-data 加载楷体真实逐笔几何。
//
// 设计要点（对齐项目「纯前端 / 文本永不离开浏览器」承诺）：
//   · 数据由 scripts/copy-kai-strokes.mjs 在 predev/prebuild 阶段从 npm 依赖
//     hanzi-writer-data 复制到 public/strokes/kai/，运行时以**同源** fetch 加载，
//     零外部 CDN、零出网，与项目既有的 public/strokeorder、public/kaioutline 同源策略一致。
//   · hanzi-writer-data 提供每字独立的 strokes（真实轮廓 SVG path）与 medians（真实笔顺中轴线），
//     按正确笔顺排序 —— 这才是「真·逐笔」，区别于 C3 的「整字轮廓等分周长」近似。
//   · 缺失字（fetch 404 / 解析失败）返回 null，由 scene.ts 回落轮廓方案；不做静默整字跳现。
//
// 数据源：Make Me a Hanzi（makemeahanzi）派生自 Arphic PL KaitiM/UKai 字体，
// 许可见仓库根 THIRD-PARTY-NOTICES.md。
import type { StrokeGlyph, StrokeSegment } from './types';

const KAI_STROKE_BASE = '/strokes/kai';
const cache = new Map<string, StrokeGlyph | null>();

interface RawKai {
  strokes: string[];
  medians: Array<Array<[number, number]>>;
}

function medianLength(m: Array<[number, number]>): number {
  let L = 0;
  for (let i = 1; i < m.length; i++) L += Math.hypot(m[i][0] - m[i - 1][0], m[i][1] - m[i - 1][1]);
  return L;
}

function toStrokeGlyph(ch: string, raw: RawKai): StrokeGlyph {
  const strokes: StrokeSegment[] = raw.medians.map((median, i) => ({
    outline: raw.strokes[i] ?? '',
    median,
    length: medianLength(median),
  }));
  return {
    char: ch,
    fontFamily: 'kai',
    unitsPerEm: 1024,
    bbox: { x: 0, y: 0, w: 1024, h: 1024 },
    fidelity: 'authored',
    strokes,
  };
}

/**
 * 加载单字楷体真实逐笔几何（离线、同源）。
 * 返回 StrokeGlyph（真笔顺），未收录或加载失败返回 null（调用方回落轮廓方案）。
 */
export async function getKaiStrokeGlyph(ch: string): Promise<StrokeGlyph | null> {
  if (cache.has(ch)) return cache.get(ch) ?? null;
  try {
    const res = await fetch(`${KAI_STROKE_BASE}/${encodeURIComponent(ch)}.json`);
    if (!res.ok) {
      cache.set(ch, null);
      return null;
    }
    const raw = (await res.json()) as RawKai;
    if (!raw || !Array.isArray(raw.medians) || raw.medians.length === 0) {
      cache.set(ch, null);
      return null;
    }
    const g = toStrokeGlyph(ch, raw);
    cache.set(ch, g);
    return g;
  } catch {
    cache.set(ch, null);
    return null;
  }
}

/** 清空 KaiAdaptor 缓存（HMR / 测试用）。 */
export function invalidateKaiStrokeCache(): void {
  cache.clear();
}
