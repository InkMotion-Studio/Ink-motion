// V1-C3 测试：字体上传校验、4K 画布规格与性能策略、导出取消
import { describe, it, expect } from 'vitest';
import {
  detectFormat,
  validateFontFile,
  FONT_SIZE_LIMIT,
} from '@/lib/fontUpload';
import { planPerformance, estimateCanvasMemoryMB } from '@/lib/perf';
import { ExportAbortError } from '@/engine';

describe('字体上传校验（N3.1）', () => {
  it('识别受支持的字体格式', () => {
    expect(detectFormat('a.ttf')).toBe('truetype');
    expect(detectFormat('b.OTF')).toBe('opentype');
    expect(detectFormat('c.woff2')).toBe('woff2');
    expect(detectFormat('d.woff')).toBe('woff2');
  });

  it('拒绝未知格式', () => {
    expect(detectFormat('virus.exe')).toBeNull();
    // V2-C4 N4.1：错误文案改为 i18n 错误码（由 UI 本地化呈现）
    expect(validateFontFile({ name: 'virus.exe', size: 1024 })).toBe('font.err.format');
  });

  it('拒绝超过体积上限的文件', () => {
    const res = validateFontFile({ name: 'big.ttf', size: FONT_SIZE_LIMIT + 1 });
    expect(res).toBe('font.err.tooLarge');
  });

  it('拒绝空文件', () => {
    expect(validateFontFile({ name: 'empty.ttf', size: 0 })).toBe('font.err.empty');
  });

  it('合法文件通过校验', () => {
    expect(validateFontFile({ name: 'ok.ttf', size: 1024 })).toBeNull();
  });
});

describe('4K 画布规格与性能策略（N3.3）', () => {
  it('估算画布内存：1080×1920 约 7.9MB，4K 约 31.6MB', () => {
    expect(estimateCanvasMemoryMB(1080, 1920)).toBeCloseTo(7.91, 1);
    expect(estimateCanvasMemoryMB(2160, 3840)).toBeCloseTo(31.64, 1);
  });

  it('4K 画布下帧率被限制在 30fps 以内', () => {
    const plan = planPerformance(100, 60, { width: 2160, height: 3840 });
    expect(plan.framerate).toBeLessThanOrEqual(30);
    expect(plan.degraded).toBe(true);
  });

  it('1080p 画布下短文本不降帧', () => {
    const plan = planPerformance(100, 30, { width: 1080, height: 1920 });
    expect(plan.framerate).toBe(30);
    expect(plan.degraded).toBe(false);
  });

  it('4K + 超长文：24fps 且分块渲染', () => {
    const plan = planPerformance(3000, 60, { width: 2160, height: 3840 });
    expect(plan.framerate).toBe(24);
    expect(plan.chunkSize).toBe(200);
    expect(plan.note).toMatch(/4K/);
  });

  it('不传画布尺寸时行为与旧版一致（向后兼容）', () => {
    const plan = planPerformance(100, 30);
    expect(plan.framerate).toBe(30);
  });
});

describe('导出取消（N3.4）', () => {
  it('ExportAbortError 名称与消息正确', () => {
    const e = new ExportAbortError();
    expect(e.name).toBe('ExportAbortError');
    expect(e.message).toBe('导出已取消');
    expect(e).toBeInstanceOf(Error);
  });
});
