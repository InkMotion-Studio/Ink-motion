// V2-C2 N2.3：轻量 TrueType 轮廓解析（自研，零依赖）。
//
// 目的：为受限字库路径（seal/li）提供「沿字形轮廓描绘显现」的动画数据。
// 为何自研而非 opentype.js：后者约 80KB（压缩后），会突破 V2 门禁（gzip<200KB）。
// 本实现仅覆盖解析 glyf 表简单/复合轮廓所需的最小子集，失败一律返回 null（静默降级整字填充）。
//
// 坐标：TTF 使用 y 向上、unitsPerEm 为设计网格；outline 保留设计坐标（未经变换），
// 由 stroke.drawGlyphOutline 负责映射到字形方块。
//
// 仅支持：TrueType（glyf/loca，有 cmap format 4/12）。CFF/OTF 不支持（返回 null → 降级）。
// 复合字形：仅支持标准平移/缩放分量（无 hinting），足以覆盖常用字体。

import { getCustomOutline } from './customStroke';

export interface OutlinePoint {
  x: number;
  y: number;
  on: boolean; // true=曲线上的点，false=二次贝塞尔控制点
}

export interface OutlineContour {
  points: OutlinePoint[]; // 首尾隐式闭合
  length: number; // 轮廓周长（设计坐标系，供弧长截断）
}

export interface OutlineGlyph {
  contours: OutlineContour[];
  unitsPerEm: number;
  /** 字体设计框：xMin/yMin/xMax/yMax（设计坐标，供居中/缩放） */
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

// ===== 二进制读取器（DataView 便捷包装，大端为主） =====
class Reader {
  private readonly view: DataView;
  private readonly dec = new TextDecoder('latin1');
  constructor(private readonly buf: ArrayBuffer) {
    this.view = new DataView(buf);
  }
  get length(): number {
    return this.buf.byteLength;
  }
  u8(o: number): number {
    return this.view.getUint8(o);
  }
  i8(o: number): number {
    return this.view.getInt8(o);
  }
  u16(o: number): number {
    return this.view.getUint16(o, false);
  }
  i16(o: number): number {
    return this.view.getInt16(o, false);
  }
  u32(o: number): number {
    return this.view.getUint32(o, false);
  }
  tag(o: number): string {
    return this.dec.decode(new Uint8Array(this.buf, o, 4));
  }
}

interface TableRecord {
  offset: number;
  length: number;
}

interface FontTables {
  tables: Map<string, TableRecord>;
  unitsPerEm: number;
  indexToLocFormat: 0 | 1;
  numGlyphs: number;
  buf: ArrayBuffer;
}

/** 解析字体表目录与 head/maxp 基础字段。失败返回 null。 */
function parseTables(buf: ArrayBuffer): FontTables | null {
  try {
    const r = new Reader(buf);
    if (buf.byteLength < 12) return null;
    const sfnt = r.u32(0);
    // 0x00010000 = TrueType；'true' = Apple TrueType；'OTTO' = CFF（不支持）
    const isTT = sfnt === 0x00010000 || sfnt === 0x74727565;
    if (!isTT) return null; // 含 OTTO/CFF 与 ttc 集合：降级
    const numTables = r.u16(4);
    const tables = new Map<string, TableRecord>();
    for (let i = 0; i < numTables; i++) {
      const rec = 12 + i * 16;
      if (rec + 16 > buf.byteLength) return null;
      const tag = r.tag(rec);
      tables.set(tag, { offset: r.u32(rec + 8), length: r.u32(rec + 12) });
    }
    const head = tables.get('head');
    const maxp = tables.get('maxp');
    const glyf = tables.get('glyf');
    const loca = tables.get('loca');
    if (!head || !maxp || !glyf || !loca) return null;
    const unitsPerEm = r.u16(head.offset + 18) || 1000;
    const indexToLocFormat = (r.i16(head.offset + 50) === 1 ? 1 : 0) as 0 | 1;
    const numGlyphs = r.u16(maxp.offset + 4);
    return { tables, unitsPerEm, indexToLocFormat, numGlyphs, buf };
  } catch {
    return null;
  }
}

/** cmap：字符 → 字形索引。仅支持 format 4（BMP）与 format 12（全 Unicode）。 */
function cmapLookup(t: FontTables, codePoint: number): number {
  try {
    const cmap = t.tables.get('cmap');
    if (!cmap) return 0;
    const r = new Reader(t.buf);
    const base = cmap.offset;
    const numSub = r.u16(base + 2);
    let best4 = -1;
    let best12 = -1;
    for (let i = 0; i < numSub; i++) {
      const rec = base + 4 + i * 8;
      const platform = r.u16(rec);
      const encoding = r.u16(rec + 2);
      const sub = base + r.u32(rec + 4);
      const format = r.u16(sub);
      // 优先 (3,10) 全 Unicode，其次 (3,1) BMP、(0,*) Unicode
      if (format === 12 && (platform === 3 || platform === 0)) best12 = sub;
      else if (format === 4 && (platform === 3 || platform === 0)) {
        if (best4 < 0 || (platform === 3 && encoding === 1)) best4 = sub;
      }
    }
    if (best12 >= 0 && codePoint > 0xffff) return lookup12(r, best12, codePoint);
    if (best4 >= 0) {
      const g = lookup4(r, best4, codePoint);
      if (g !== 0 || codePoint <= 0xffff) return g;
    }
    if (best12 >= 0) return lookup12(r, best12, codePoint);
    return 0;
  } catch {
    return 0;
  }
}

function lookup4(r: Reader, sub: number, cp: number): number {
  if (cp > 0xffff) return 0;
  const segCountX2 = r.u16(sub + 6);
  const segCount = segCountX2 / 2;
  const endBase = sub + 14;
  const startBase = endBase + segCountX2 + 2;
  const deltaBase = startBase + segCountX2;
  const rangeBase = deltaBase + segCountX2;
  for (let i = 0; i < segCount; i++) {
    if (r.u16(endBase + i * 2) >= cp) {
      const start = r.u16(startBase + i * 2);
      if (start > cp) return 0;
      const delta = r.i16(deltaBase + i * 2);
      const rangeOffset = r.u16(rangeBase + i * 2);
      if (rangeOffset === 0) return (cp + delta) & 0xffff;
      const glyphAddr = rangeBase + i * 2 + rangeOffset + (cp - start) * 2;
      if (glyphAddr + 2 > r.length) return 0;
      const g = r.u16(glyphAddr);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
  }
  return 0;
}

function lookup12(r: Reader, sub: number, cp: number): number {
  const nGroups = r.u32(sub + 12);
  let lo = 0;
  let hi = nGroups - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const g = sub + 16 + mid * 12;
    const start = r.u32(g);
    const end = r.u32(g + 4);
    if (cp < start) hi = mid - 1;
    else if (cp > end) lo = mid + 1;
    else return r.u32(g + 8) + (cp - start);
  }
  return 0;
}

/** loca 表：字形索引 → glyf 表内偏移。 */
function glyphOffset(t: FontTables, gi: number): { off: number; len: number } | null {
  const loca = t.tables.get('loca')!;
  const glyf = t.tables.get('glyf')!;
  const r = new Reader(t.buf);
  const base = loca.offset;
  let start: number;
  let end: number;
  if (t.indexToLocFormat === 1) {
    if (base + gi * 4 + 8 > r.length) return null;
    start = r.u32(base + gi * 4);
    end = r.u32(base + gi * 4 + 4);
  } else {
    if (base + gi * 2 + 4 > r.length) return null;
    start = r.u16(base + gi * 2) * 2;
    end = r.u16(base + gi * 2 + 2) * 2;
  }
  if (end <= start) return null; // 空字形（如空格）
  return { off: glyf.offset + start, len: end - start };
}

/** 解析单个简单/复合字形轮廓（含递归深度限制，防恶意/损坏字体死循环）。 */
function parseGlyph(
  t: FontTables,
  gi: number,
  depth = 0,
): { contours: OutlinePoint[][]; xMin: number; yMin: number; xMax: number; yMax: number } | null {
  if (depth > 5 || gi <= 0 || gi >= t.numGlyphs) return null;
  const loc = glyphOffset(t, gi);
  if (!loc || loc.len < 10) return null;
  const r = new Reader(t.buf);
  const b = loc.off;
  const numberOfContours = r.i16(b);
  const xMin = r.i16(b + 2);
  const yMin = r.i16(b + 4);
  const xMax = r.i16(b + 6);
  const yMax = r.i16(b + 8);

  if (numberOfContours >= 0) {
    return parseSimple(r, b + 10, numberOfContours, { xMin, yMin, xMax, yMax });
  }
  // 复合字形
  return parseComposite(t, r, b + 10, { xMin, yMin, xMax, yMax }, depth);
}

function parseSimple(
  r: Reader,
  start: number,
  nContours: number,
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number },
): { contours: OutlinePoint[][]; xMin: number; yMin: number; xMax: number; yMax: number } | null {
  let p = start;
  const endPts: number[] = [];
  for (let i = 0; i < nContours; i++) {
    endPts.push(r.u16(p));
    p += 2;
  }
  const nPoints = nContours > 0 ? endPts[nContours - 1] + 1 : 0;
  if (nPoints === 0) return { contours: [], ...bbox };
  const instructionLength = r.u16(p);
  p += 2 + instructionLength;
  if (p > r.length) return null;

  const flags: number[] = [];
  while (flags.length < nPoints) {
    if (p >= r.length) return null;
    const f = r.u8(p++);
    flags.push(f);
    if (f & 0x08) {
      // 重复标志
      if (p >= r.length) return null;
      const rep = r.u8(p++);
      for (let i = 0; i < rep; i++) flags.push(f);
    }
  }
  // x 坐标
  const xs: number[] = [];
  let x = 0;
  for (let i = 0; i < nPoints; i++) {
    const f = flags[i];
    if (f & 0x02) {
      // 1 字节 x
      if (p >= r.length) return null;
      const dx = r.u8(p++);
      x += f & 0x10 ? dx : -dx;
    } else if (!(f & 0x10)) {
      // 2 字节有符号 x
      if (p + 2 > r.length) return null;
      x += r.i16(p);
      p += 2;
    }
    xs.push(x);
  }
  // y 坐标
  const ys: number[] = [];
  let y = 0;
  for (let i = 0; i < nPoints; i++) {
    const f = flags[i];
    if (f & 0x04) {
      if (p >= r.length) return null;
      const dy = r.u8(p++);
      y += f & 0x20 ? dy : -dy;
    } else if (!(f & 0x20)) {
      if (p + 2 > r.length) return null;
      y += r.i16(p);
      p += 2;
    }
    ys.push(y);
  }
  const points: OutlinePoint[] = [];
  for (let i = 0; i < nPoints; i++) points.push({ x: xs[i], y: ys[i], on: (flags[i] & 0x01) !== 0 });

  // 按 endPts 切分轮廓
  const contours: OutlinePoint[][] = [];
  let from = 0;
  for (const end of endPts) {
    contours.push(points.slice(from, end + 1));
    from = end + 1;
  }
  return { contours, ...bbox };
}

function parseComposite(
  t: FontTables,
  r: Reader,
  start: number,
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number },
  depth: number,
): { contours: OutlinePoint[][]; xMin: number; yMin: number; xMax: number; yMax: number } | null {
  let p = start;
  const out: OutlinePoint[][] = [];
  const ARG_1_AND_2_ARE_WORDS = 0x0001;
  const ARGS_ARE_XY_VALUES = 0x0002;
  const WE_HAVE_A_SCALE = 0x0008;
  const MORE_COMPONENTS = 0x0020;
  const WE_HAVE_AN_X_AND_Y_SCALE = 0x0040;
  const WE_HAVE_A_TWO_BY_TWO = 0x0080;
  let guard = 0;
  for (;;) {
    if (guard++ > 64) return null;
    if (p + 4 > r.length) return null;
    const flags = r.u16(p);
    const glyphIndex = r.u16(p + 2);
    p += 4;
    let dx = 0;
    let dy = 0;
    let a = 1;
    let bb = 0;
    let c = 0;
    let d = 1;
    if (flags & ARG_1_AND_2_ARE_WORDS) {
      if (flags & ARGS_ARE_XY_VALUES) {
        dx = r.i16(p);
        dy = r.i16(p + 2);
      }
      p += 4;
    } else {
      if (flags & ARGS_ARE_XY_VALUES) {
        dx = r.i8(p);
        dy = r.i8(p + 1);
      }
      p += 2;
    }
    if (flags & WE_HAVE_A_SCALE) {
      a = d = r.i16(p) / 16384;
      p += 2;
    } else if (flags & WE_HAVE_AN_X_AND_Y_SCALE) {
      a = r.i16(p) / 16384;
      d = r.i16(p + 2) / 16384;
      p += 4;
    } else if (flags & WE_HAVE_A_TWO_BY_TWO) {
      a = r.i16(p) / 16384;
      bb = r.i16(p + 2) / 16384;
      c = r.i16(p + 4) / 16384;
      d = r.i16(p + 6) / 16384;
      p += 8;
    }
    const sub = parseGlyph(t, glyphIndex, depth + 1);
    if (sub) {
      for (const contour of sub.contours) {
        out.push(
          contour.map((pt) => ({
            x: a * pt.x + c * pt.y + dx,
            y: bb * pt.x + d * pt.y + dy,
            on: pt.on,
          })),
        );
      }
    }
    if (!(flags & MORE_COMPONENTS)) break;
  }
  return { contours: out, ...bbox };
}

/** 计算单个轮廓的设计坐标周长（近似：折线 + 二次贝塞尔采样）。 */
function contourLength(contour: OutlinePoint[]): number {
  const n = contour.length;
  if (n === 0) return 0;
  // 建立点序列：若首点非 on，则用末尾 on 点（或中点）补起点
  let len = 0;
  const at = (i: number) => contour[((i % n) + n) % n];
  let startIdx = 0;
  while (startIdx < n && !contour[startIdx].on) startIdx++;
  if (startIdx === n) return 0; // 全为控制点（畸形）
  let prev = contour[startIdx];
  for (let k = 1 as number; k <= n; ) {
    const cur = at(startIdx + k);
    if (cur.on) {
      len += Math.hypot(cur.x - prev.x, cur.y - prev.y);
      prev = cur;
      k++;
    } else {
      // 二次贝塞尔：控制点 cur，终点 startIdx+k+1（若为非 on，用中点作隐式 on 点）
      const next = at(startIdx + k + 1);
      const endPt = next.on ? next : { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2, on: true };
      len += quadApproxLen(prev, cur, endPt);
      prev = endPt;
      k += next.on ? 2 : 1;
    }
  }
  // 闭合
  if (prev.x !== contour[startIdx].x || prev.y !== contour[startIdx].y) {
    len += Math.hypot(contour[startIdx].x - prev.x, contour[startIdx].y - prev.y);
  }
  return len;
}

function quadApproxLen(p0: OutlinePoint, c: OutlinePoint, p1: OutlinePoint): number {
  const SEG = 8;
  let len = 0;
  let px = p0.x;
  let py = p0.y;
  for (let i = 1; i <= SEG; i++) {
    const tt = i / SEG;
    const mt = 1 - tt;
    const x = mt * mt * p0.x + 2 * mt * tt * c.x + tt * tt * p1.x;
    const y = mt * mt * p0.y + 2 * mt * tt * c.y + tt * tt * p1.y;
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

// ===== 缓存（按字体 URL + 码位） =====
const bufferCache = new Map<string, Promise<ArrayBuffer | null>>();
const glyphCache = new Map<string, OutlineGlyph | null>();
let parsedCache = new WeakMap<ArrayBuffer, FontTables | null>();

function fetchBuffer(url: string): Promise<ArrayBuffer | null> {
  if (bufferCache.has(url)) return bufferCache.get(url)!;
  const p = (async (): Promise<ArrayBuffer | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  })();
  bufferCache.set(url, p);
  return p;
}

/**
 * 解析指定字体中某码位的字形轮廓。
 * @returns OutlineGlyph；以下情况返回 null（调用方降级整字填充）：
 *  - 字体非 TrueType（CFF/OTF/TTC）
 *  - 码位无字形（.notdef / 空字形）
 *  - 轮廓为空或解析失败
 */
export async function parseGlyphOutline(fontUrl: string, codePoint: number): Promise<OutlineGlyph | null> {
  const key = `${fontUrl}#${codePoint}`;
  if (glyphCache.has(key)) return glyphCache.get(key) ?? null;
  try {
    const buf = await fetchBuffer(fontUrl);
    if (!buf) {
      glyphCache.set(key, null);
      return null;
    }
    let tables = parsedCache.get(buf);
    if (tables === undefined) {
      tables = parseTables(buf);
      parsedCache.set(buf, tables);
    }
    if (!tables) {
      glyphCache.set(key, null);
      return null;
    }
    const gi = cmapLookup(tables, codePoint);
    if (!gi) {
      glyphCache.set(key, null);
      return null;
    }
    const raw = parseGlyph(tables, gi);
    if (!raw || raw.contours.length === 0) {
      glyphCache.set(key, null);
      return null;
    }
    const contours: OutlineContour[] = raw.contours.map((c) => ({ points: c, length: contourLength(c) }));
    const glyph: OutlineGlyph = {
      contours,
      unitsPerEm: tables.unitsPerEm,
      xMin: raw.xMin,
      yMin: raw.yMin,
      xMax: raw.xMax,
      yMax: raw.yMax,
    };
    glyphCache.set(key, glyph);
    return glyph;
  } catch {
    glyphCache.set(key, null);
    return null;
  }
}

/** 同步查询已解析缓存（供性能敏感路径与测试使用）。 */
export function getCachedOutline(fontUrl: string, codePoint: number): OutlineGlyph | null {
  return glyphCache.get(`${fontUrl}#${codePoint}`) ?? null;
}

/** 轮廓总周长（供测试/诊断）。 */
export function totalOutlineLength(o: OutlineGlyph): number {
  return o.contours.reduce((s, c) => s + c.length, 0);
}

/** 是否有可用轮廓数据（决策辅助）。 */
export function hasOutline(o: OutlineGlyph | null | undefined): o is OutlineGlyph {
  return !!o && o.contours.length > 0;
}

// ===== C3：楷体字形轮廓（构建期预提取，运行期零网络按需加载） =====
//
// 数据由 scripts/build-kai-outline.py 从完整楷体源（LXGW WenKai Lite）提取，
// 存于 public/kaioutline/（stvarokes-{base16}-{end16}.json + manifest），
// 与 C1 笔顺数据同源风格。紧凑数组格式：contour.points = [x,y,on, x,y,on, ...]。

interface KaiManifest {
  range: { start: number; end: number };
  chunks: { file: string; start: number; end: number; chars: number }[];
  unitsPerEm: number;
}
const KAI_BASE = 'kaioutline/';
let kaiManifest: KaiManifest | null = null;
let kaiManifestLoading: Promise<KaiManifest | null> | null = null;
const kaiChunkCache = new Map<string, Promise<Record<string, KaiRaw> | null>>();
const kaiGlyphCache = new Map<string, OutlineGlyph | null>();

interface KaiRaw {
  contours: { points: number[]; length: number }[];
  unitsPerEm: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

async function ensureKaiManifest(): Promise<KaiManifest | null> {
  if (kaiManifest) return kaiManifest;
  if (kaiManifestLoading) return kaiManifestLoading;
  kaiManifestLoading = (async () => {
    try {
      const res = await fetch(KAI_BASE + 'kaioutline.manifest.json');
      if (!res.ok) return null;
      const m = (await res.json()) as KaiManifest;
      kaiManifest = m;
      return m;
    } catch {
      return null;
    }
  })();
  return kaiManifestLoading;
}

function kaiChunkFileFor(cp: number): string | null {
  const m = kaiManifest;
  if (!m) return null;
  if (cp < m.range.start || cp > m.range.end) return null;
  for (const c of m.chunks) if (cp >= c.start && cp <= c.end) return c.file;
  return null;
}

async function loadKaiChunk(file: string): Promise<Record<string, KaiRaw> | null> {
  if (kaiChunkCache.has(file)) return kaiChunkCache.get(file)!;
  const p = (async () => {
    try {
      const res = await fetch(KAI_BASE + file);
      if (!res.ok) return null;
      return (await res.json()) as Record<string, KaiRaw>;
    } catch {
      return null;
    }
  })();
  kaiChunkCache.set(file, p);
  return p;
}

/** C3/C4：加载某汉字的楷体字形轮廓（零网络、按码位分片）。优先级 C(用户定制) > C3 内置。
 *  非 CJK 基本区且无定制时返回 null。 */
export async function getKaiOutline(ch: string): Promise<OutlineGlyph | null> {
  if (kaiGlyphCache.has(ch)) return kaiGlyphCache.get(ch) ?? null;
  // C4：用户定制轮廓优先（最高优先级）
  const custom = await getCustomOutline(ch);
  if (custom && custom.contours.length > 0) {
    const contours: OutlineContour[] = custom.contours.map((c) => {
      const pts: OutlinePoint[] = [];
      const arr = c.points;
      for (let i = 0; i + 2 < arr.length; i += 3) {
        pts.push({ x: arr[i], y: arr[i + 1], on: arr[i + 2] === 1 });
      }
      return { points: pts, length: contourLength(pts) };
    });
    const glyph: OutlineGlyph = {
      contours,
      unitsPerEm: custom.unitsPerEm,
      xMin: custom.xMin,
      yMin: custom.yMin,
      xMax: custom.xMax,
      yMax: custom.yMax,
    };
    kaiGlyphCache.set(ch, glyph);
    return glyph;
  }
  const cp = ch.codePointAt(0);
  if (cp === undefined) {
    kaiGlyphCache.set(ch, null);
    return null;
  }
  const m = await ensureKaiManifest();
  if (!m) {
    kaiGlyphCache.set(ch, null);
    return null;
  }
  const file = kaiChunkFileFor(cp);
  if (!file) {
    kaiGlyphCache.set(ch, null);
    return null;
  }
  const chunk = await loadKaiChunk(file);
  const raw = chunk?.[ch];
  if (!raw) {
    kaiGlyphCache.set(ch, null);
    return null;
  }
  const contours: OutlineContour[] = raw.contours.map((c) => {
    const pts: OutlinePoint[] = [];
    const arr = c.points;
    for (let i = 0; i + 2 < arr.length; i += 3) {
      pts.push({ x: arr[i], y: arr[i + 1], on: arr[i + 2] === 1 });
    }
    return { points: pts, length: c.length };
  });
  const glyph: OutlineGlyph = {
    contours,
    unitsPerEm: raw.unitsPerEm,
    xMin: raw.xMin,
    yMin: raw.yMin,
    xMax: raw.xMax,
    yMax: raw.yMax,
  };
  kaiGlyphCache.set(ch, glyph);
  return glyph;
}

/** 测试辅助：清空解析缓存（含 C3 楷体轮廓缓存）。 */
export function __clearOutlineCache(): void {
  bufferCache.clear();
  glyphCache.clear();
  parsedCache = new WeakMap();
  kaiChunkCache.clear();
  kaiGlyphCache.clear();
  kaiManifest = null;
  kaiManifestLoading = null;
}

/** C4：用户修改定制轮廓后失效楷体轮廓缓存，使下次查询回源最新 C 层数据。 */
export function invalidateKaiOutlineCache(): void {
  kaiGlyphCache.clear();
}
