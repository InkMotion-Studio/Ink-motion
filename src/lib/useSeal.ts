// V1-C1 N1.3 / V2-C1 N1.2+N1.4：受限字符集 UI 逻辑钩子
// 提供越界字符检测、覆盖率预估与字表读取（字表浏览面板复用）。纯前端，无上传。
import { useEffect, useState } from 'react';
import {
  loadSealCharset,
  loadSealRegistry,
  estimateSealCoverage,
  type SealCharset,
  type SealRegistry,
  type SealLayerSetting,
} from '@/lib/seal';
import { useSettingsStore } from '@/store/settings';
import type { FontFamily } from '@/db/types';

/** 加载字表（模块级缓存，多次调用共享）。 */
export async function getSealCharset(): Promise<SealCharset> {
  return (await loadSealCharset()) ?? { version: 'none', layer: 'L0', glyphs: [], modernIndex: {} };
}

/** V2-C1 N1.1：加载合并注册表（按设置项启用层）。 */
export async function getSealRegistry(setting: SealLayerSetting): Promise<SealRegistry | null> {
  return loadSealRegistry(setting);
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

/** 越界字符（基于合并注册表，反映启用层）。 */
export function computeOutOfRangeV2(text: string, reg: SealRegistry): string[] {
  const out = new Set<string>();
  for (const ch of Array.from(text)) {
    if (ch.trim().length === 0) continue;
    if (!reg.coverageChars.has(ch)) out.add(ch);
  }
  return Array.from(out);
}

/**
 * 编辑器用：当字体为小篆时，计算越界字符并提示。
 * 非小篆字体返回空数组（越界逻辑仅适用于古文字受限字库）。
 * V2-C1 N1.1：越界判定基于按设置启用的合并注册表（L0/L1/L2）。
 */
export function useSealOutOfRange(text: string, family: FontFamily): string[] {
  const [out, setOut] = useState<string[]>([]);
  useEffect(() => {
    if (family !== 'seal') {
      setOut([]);
      return;
    }
    let cancelled = false;
    const setting = useSettingsStore.getState().sealLayers ?? 'L0';
    loadSealRegistry(setting)
      .then((reg) => {
        if (cancelled) return;
        setOut(reg ? computeOutOfRangeV2(text, reg) : computeOutOfRange(text, {
          version: 'none',
          layer: 'L0',
          glyphs: [],
          modernIndex: {},
        }));
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

/**
 * V2-C1 N1.4：篆书覆盖率预估（基于启用层的合并注册表）。
 * 非小篆字体返回 null（覆盖率仅适用于古文字受限字库）。
 */
export interface SealCoverageInfo {
  covered: number;
  total: number;
  ratio: number;
  layers: SealLayerSetting;
}

export function useSealCoverage(text: string, family: FontFamily): SealCoverageInfo | null {
  const [info, setInfo] = useState<SealCoverageInfo | null>(null);
  useEffect(() => {
    if (family !== 'seal') {
      setInfo(null);
      return;
    }
    let cancelled = false;
    const setting = useSettingsStore.getState().sealLayers ?? 'L0';
    loadSealRegistry(setting)
      .then((reg) => {
        if (cancelled) return;
        if (!reg) {
          setInfo({ covered: 0, total: 0, ratio: 1, layers: setting });
          return;
        }
        const cov = estimateSealCoverage(text, reg);
        setInfo({ covered: cov.covered, total: cov.total, ratio: cov.ratio, layers: setting });
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
