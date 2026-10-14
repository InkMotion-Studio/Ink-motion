// V1-C1 N1.3：受限字符集 UI 逻辑钩子
// 提供越界字符检测与字表读取（字表浏览面板复用）。纯前端，无上传。
import { useEffect, useState } from 'react';
import { loadSealCharset, type SealCharset } from '@/lib/seal';
import type { FontFamily } from '@/db/types';

/** 加载字表（模块级缓存，多次调用共享）。 */
export async function getSealCharset(): Promise<SealCharset> {
  return loadSealCharset();
}

/** 计算文本中越界（不在小篆受限字表内）的字符集合，返回去重后的字符数组。 */
export function computeOutOfRange(text: string, charset: SealCharset): string[] {
  const out = new Set<string>();
  for (const ch of Array.from(text)) {
    if (ch.trim().length === 0) continue;
    // 标点直接视为可渲染（字体子集含常用标点）
    if (charset.modernIndex[ch] === undefined) out.add(ch);
  }
  return Array.from(out);
}

/**
 * 编辑器用：当字体为小篆时，计算越界字符并提示。
 * 非小篆字体返回空数组（越界逻辑仅适用于古文字受限字库）。
 */
export function useSealOutOfRange(text: string, family: FontFamily): string[] {
  const [out, setOut] = useState<string[]>([]);
  useEffect(() => {
    if (family !== 'seal') {
      setOut([]);
      return;
    }
    let cancelled = false;
    loadSealCharset()
      .then((cs) => {
        if (!cancelled) setOut(computeOutOfRange(text, cs));
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
