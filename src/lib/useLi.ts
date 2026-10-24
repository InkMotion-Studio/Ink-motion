// V2-C2 N2.2：隶书受限字库 UI 逻辑钩子（镜像 useSeal.ts，独立实现避免改动 V2-C1 既有钩子）
import { useEffect, useState } from 'react';
import { loadLiCharset, estimateLiCoverage, type LiCharset } from '@/lib/lishu';
import type { FontFamily } from '@/db/types';

/** 加载隶书字表（模块级缓存，多次调用共享）。缺失时返回 null（不拦截）。 */
export async function getLiCharset(): Promise<LiCharset | null> {
  return loadLiCharset();
}

/** 计算文本中越界（不在隶书字表内）的字符；字表缺失时返回空（不拦截）。 */
export function computeLiOutOfRange(text: string, charset: LiCharset | null): string[] {
  if (!charset) return [];
  const out = new Set<string>();
  for (const ch of Array.from(text)) {
    if (ch.trim().length === 0) continue;
    if (charset.modernIndex[ch] === undefined) out.add(ch);
  }
  return Array.from(out);
}

/** 编辑器用：隶书路径越界字符。非隶书字体返回空数组。 */
export function useLiOutOfRange(text: string, family: FontFamily): string[] {
  const [out, setOut] = useState<string[]>([]);
  useEffect(() => {
    if (family !== 'li') {
      setOut([]);
      return;
    }
    let cancelled = false;
    loadLiCharset()
      .then((cs) => {
        if (!cancelled) setOut(computeLiOutOfRange(text, cs));
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

export interface LiCoverageInfo {
  covered: number;
  total: number;
  ratio: number;
  /** 字表是否随包（false=待提供，覆盖率为保守 1） */
  charsetAvailable: boolean;
}

/** 隶书覆盖率预估。非隶书字体返回 null。 */
export function useLiCoverage(text: string, family: FontFamily): LiCoverageInfo | null {
  const [info, setInfo] = useState<LiCoverageInfo | null>(null);
  useEffect(() => {
    if (family !== 'li') {
      setInfo(null);
      return;
    }
    let cancelled = false;
    loadLiCharset()
      .then((cs) => {
        if (cancelled) return;
        const cov = estimateLiCoverage(text, cs);
        setInfo({ covered: cov.covered, total: cov.total, ratio: cov.ratio, charsetAvailable: cs !== null });
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [text, family]);
  return info;
}
