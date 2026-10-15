// V2-C7 C7 BUG-005 修复：字体缺字探测。
//
// 背景：楷/宋（含毛笔楷）走整字渲染路径时，若系统/内置字库未覆盖某字符，
// `fillText` 会静默落空 —— 画面完全空白且无任何提示，用户无法区分「没渲染」与「坏了」。
// 本模块读取构建期生成的分片清单 public/fonts/builtin/fonts.manifest.json，
// 按字符码位判定其是否落在当前字体任一分片的 [start,end] 区间内；
// 未覆盖者即为「当前字体不支持」，供编辑器给出明确提示（复用既有越界提示样式）。
import { useEffect, useState } from 'react';
import type { FontFamily } from '@/db/types';

interface FontChunk {
  file: string;
  start: number;
  end: number;
  chars: number;
}
interface FontEntry {
  prefix: string;
  family: string;
  usage: string;
  chunks: FontChunk[];
}
interface FontsManifest {
  generatedBy: string;
  fonts: FontEntry[];
}

const MANIFEST_URL = 'fonts/builtin/fonts.manifest.json';

let manifestCache: FontsManifest | null = null;
let manifestPromise: Promise<FontsManifest | null> | null = null;

async function ensureManifest(): Promise<FontsManifest | null> {
  if (manifestCache) return manifestCache;
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL)
      .then((r) => (r.ok ? (r.json() as Promise<FontsManifest>) : null))
      .then((m) => {
        manifestCache = m;
        return m;
      })
      .catch(() => null);
  }
  return manifestPromise;
}

/** 把每个 usage 的码位区间合并为有序、互不重叠的区间数组，便于快速判定。 */
function rangesFor(manifest: FontsManifest, family: FontFamily): Array<[number, number]> {
  const entry = manifest.fonts.find((f) => f.usage === family);
  if (!entry) return [];
  const ranges = entry.chunks
    .map((c) => [c.start, c.end] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

function isCovered(cp: number, ranges: Array<[number, number]>): boolean {
  // 二分查找
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [s, e] = ranges[mid];
    if (cp < s) hi = mid - 1;
    else if (cp > e) lo = mid + 1;
    else return true;
  }
  return false;
}

/**
 * 计算文本中「当前字体（整字路径）无法渲染」的字符（去重、按出现顺序）。
 * 仅对 kai/song/brush 三类整字或轮廓路径生效；seal/li 走各自受限字库的越界逻辑。
 * 空白字符忽略；标点等由 latin/punct/fullwidth 分片覆盖，不误报。
 */
export function computeUnsupported(text: string, manifest: FontsManifest, family: FontFamily): string[] {
  const ranges = rangesFor(manifest, family);
  if (ranges.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ch of Array.from(text)) {
    if (!ch.trim()) continue;
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (!isCovered(cp, ranges) && !seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out;
}

/**
 * 编辑器用：当前字体缺字检测。
 * kai/song/brush：读取分片清单判定；seal/li：返回空数组（另有越界提示）。
 */
export function useFontUnsupported(text: string, family: FontFamily): string[] {
  const [out, setOut] = useState<string[]>([]);
  useEffect(() => {
    if (family === 'seal' || family === 'li') {
      setOut([]);
      return;
    }
    let cancelled = false;
    ensureManifest()
      .then((m) => {
        if (cancelled || !m) return;
        setOut(computeUnsupported(text, m, family));
      })
      .catch(() => {
        if (!cancelled) setOut([]);
      });
    return () => {
      cancelled = true;
    };
  }, [text, family]);
  return out;
}
