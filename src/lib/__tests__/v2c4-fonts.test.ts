// V2-C4 N4.2 单元测试：内置开源字体分片资产
//
// 背景：V2-C4 自检发现"多字体库"名不副实——隶书是空壳、宋体依赖系统字体。
// 本文件锁定"内置字库真实随包提供且分片完整"这一事实，防止资产被误删或漏提交。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FONT_CATALOG, getFontMeta } from '@/lib/fonts';

interface Chunk {
  file: string;
  start: number;
  end: number;
  chars: number;
  bytes: number;
}
interface FontEntry {
  prefix: string;
  family: string;
  usage: string;
  chunks: Chunk[];
  totalBytes: number;
}

// public/ 不在 src 下，用 fs 直接读取产物清单（避免 Vite 对 public 路径的解析差异）
const manifestPath = resolve(__dirname, '../../../public/fonts/builtin/fonts.manifest.json');
const fonts = (JSON.parse(readFileSync(manifestPath, 'utf-8')) as { fonts: FontEntry[] }).fonts;

describe('V2-C4 N4.2 内置字体清单', () => {
  it('内置字体目录含五款（kai/song/brush/seal/li）', () => {
    const families = FONT_CATALOG.map((f) => f.family);
    expect(families).toEqual(['kai', 'song', 'brush', 'seal', 'li']);
  });

  it('每款字体都有本地化键与署名键（供 i18n 使用）', () => {
    for (const f of FONT_CATALOG) {
      expect(f.labelKey).toMatch(/^options\.font\./);
      expect(f.attributionKey).toMatch(/^font\.attr\./);
    }
  });

  it('getFontMeta 命中已知 family，未知回退首项', () => {
    expect(getFontMeta('brush').family).toBe('brush');
    expect(getFontMeta('nope' as never).family).toBe('kai');
  });

  it('随包字体均为 OFL 或以系统回退并如实标注', () => {
    const bundled = FONT_CATALOG.filter((f) => f.family !== 'li');
    for (const f of bundled) {
      expect(f.license).toBe('OFL');
    }
    // 隶书如实标注为系统回退（V2-C4 N4.3：不假装支持）
    const li = getFontMeta('li');
    expect(li.license).toBe('System');
    expect(li.noteKey).toBe('font.note.li');
  });
});

describe('V2-C4 N4.2 分片产物完整性', () => {
  it('三款内置字体全部产出分片', () => {
    expect(fonts.map((f) => f.usage).sort()).toEqual(['brush', 'kai', 'song']);
  });

  it('每款字体分片非空且片内字符数 > 0', () => {
    for (const font of fonts) {
      expect(font.chunks.length).toBeGreaterThan(0);
      for (const c of font.chunks) {
        expect(c.chars).toBeGreaterThan(0);
        expect(c.bytes).toBeGreaterThan(0);
        expect(c.file).toMatch(/\.woff2$/);
      }
    }
  });

  it('中文字体覆盖 CJK 基本区（4E00–9FFF）', () => {
    for (const font of fonts) {
      const covered = new Set<number>();
      for (const c of font.chunks) {
        if (c.end >= 0x4e00 && c.start <= 0x9fff) {
          for (let cp = Math.max(c.start, 0x4e00); cp <= Math.min(c.end, 0x9fff); cp++) {
            covered.add(cp);
          }
        }
      }
      // 楷体与宋体应有完整基本区覆盖；毛笔楷覆盖量较少但需 >3000
      const min = font.usage === 'brush' ? 3000 : 20000;
      expect(covered.size).toBeGreaterThan(min);
    }
  });

  it('单片体积受控（< 400KB），保证按需下载体验', () => {
    for (const font of fonts) {
      for (const c of font.chunks) {
        expect(c.bytes).toBeLessThan(400 * 1024);
      }
    }
  });

  it('分片不含 CJK 扩展 B 等超大区段（避免单片膨胀）', () => {
    for (const font of fonts) {
      for (const c of font.chunks) {
        expect(c.start).toBeLessThan(0x20000);
      }
    }
  });
});
