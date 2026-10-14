// V2-C4 N4.1 单元测试：字体注册中心 + 字体栈解析
//
// 背景：V2-C3 自检发现"字体上传毫无作用"的两个根因——
//   ① 上传后无任何消费路径（ProjectOptions 无承载字段、渲染栈写死）；
//   ② 刷新后从不重注册 FontFace。
// 本文件锁定修复后的行为，防止回归。

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBuiltinFontStack,
  uploadedFamilyName,
  isFontRegistered,
  __clearFontRegistry,
  UPLOADED_FAMILY_PREFIX,
} from '@/lib/fontRegistry';
import { resolveFontStack, isCustomFontUsable } from '@/lib/fontResolve';
import type { FontRecord } from '@/db/types';

function makeRecord(over: Partial<FontRecord> = {}): FontRecord {
  return {
    id: 'f1',
    name: 'MyFont',
    family: 'kai',
    source: 'uploaded',
    format: 'truetype',
    license: '用户上传',
    dataUrl: 'data:font/ttf;base64,AAAA',
    createdAt: 0,
    ...over,
  };
}

beforeEach(() => {
  __clearFontRegistry();
  vi.restoreAllMocks();
});

describe('V2-C4 N4.1 内置字体栈', () => {
  it('每个内置 family 都返回含兜底 serif 的非空栈', () => {
    for (const f of ['kai', 'song', 'brush', 'seal', 'li']) {
      const stack = getBuiltinFontStack(f);
      expect(stack).toBeTruthy();
      expect(stack).toMatch(/serif$/);
    }
  });

  it('未知 family 回退 serif（不抛错）', () => {
    expect(getBuiltinFontStack('nope')).toBe('serif');
  });

  it('上传字体内部字族名带前缀且空格转连字符', () => {
    expect(uploadedFamilyName('My Font')).toBe(`${UPLOADED_FAMILY_PREFIX}My-Font`);
  });
});

describe('V2-C4 N4.1 字体栈解析', () => {
  it('未选中自定义字体 → undefined（回落内置栈）', () => {
    expect(resolveFontStack(undefined, [makeRecord()])).toBeUndefined();
  });

  it('选中但记录不存在 → undefined（不渲染空白）', () => {
    expect(resolveFontStack('missing', [makeRecord()])).toBeUndefined();
  });

  it('上传字体未注册 → undefined（避免"选了却渲染不出"）', () => {
    expect(resolveFontStack('f1', [makeRecord()])).toBeUndefined();
    expect(isCustomFontUsable('f1', [makeRecord()])).toBe(false);
  });

  it('无二进制的内置扩展字体 → 直接返回其内置栈', () => {
    const builtin = makeRecord({ id: 'b1', name: 'Brush', family: 'brush', source: 'preset', dataUrl: undefined });
    const stack = resolveFontStack('b1', [builtin]);
    expect(stack).toBe(getBuiltinFontStack('brush'));
    expect(isCustomFontUsable('b1', [builtin])).toBe(true);
  });
});

describe('V2-C4 N4.1 注册状态可观测性', () => {
  it('未注册时 isFontRegistered 为 false', () => {
    expect(isFontRegistered('f1')).toBe(false);
  });
});
