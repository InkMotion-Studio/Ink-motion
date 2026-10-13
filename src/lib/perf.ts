// N4.3 性能工具：长文本分块与降帧策略、字体子集化提示。
// MVP 目标（IM-TEST-001 §7）：首屏体积可控、5000 字可导出不崩溃。

export interface PerfPlan {
  /** 建议帧率（长文自动降帧，保障编码吞吐） */
  framerate: number;
  /** 分块大小（每块渲染的字符数，用于进度与让步） */
  chunkSize: number;
  /** 是否需要降帧 */
  degraded: boolean;
  /** 建议提示（面向用户） */
  note?: string;
}

/**
 * 依据文本长度与画布规格给出渲染/导出性能策略。
 * - ≤300 字：全速
 * - 301–1500：轻微降帧（≥24）
 * - >1500：显著降帧（≥24 且分块让步），保障 5000 字可用
 */
export function planPerformance(charCount: number, requestedFps: number): PerfPlan {
  if (charCount <= 300) {
    return { framerate: requestedFps, chunkSize: 0, degraded: false };
  }
  if (charCount <= 1500) {
    return {
      framerate: Math.max(24, Math.min(requestedFps, 30)),
      chunkSize: 0,
      degraded: requestedFps > 30,
      note: '长文已自动降帧以保障流畅度',
    };
  }
  return {
    framerate: 24,
    chunkSize: 200,
    degraded: true,
    note: '超长文：已启用降帧与分块渲染（每 200 字让出主线程）',
  };
}

/** 分块迭代器：把数组切成 chunk，每块间可 await 让出主线程。 */
export async function* iterateChunks<T>(items: T[], chunkSize: number): AsyncGenerator<T[]> {
  if (chunkSize <= 0) {
    yield items;
    return;
  }
  for (let i = 0; i < items.length; i += chunkSize) {
    yield items.slice(i, i + chunkSize);
    // 让出主线程，避免长任务阻塞 UI
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** 字体子集化建议：仅当文本中出现的字符需要打包时提示（运行时按需加载天然子集化）。 */
export function subsetAdvice(uniqueChars: number): string | null {
  if (uniqueChars <= 800) return null;
  return `本文涉及 ${uniqueChars} 个不同字符，笔画数据将按需加载（天然子集化），首屏不受影响。`;
}
