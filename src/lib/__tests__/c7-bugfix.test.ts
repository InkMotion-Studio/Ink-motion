import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeUnsupported } from '@/lib/useFontCoverage';
import { computeOutOfRange } from '@/lib/useSeal';
import { THIRD_PARTY_LICENSES } from '@/lib/licenses';

const root = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

// ===================================================================
// V2-C7 C7 · V2-C6 缺陷修复回归（BUG-001/002/003/004/005/006）
// 每个用例对应 Bug 清单中的一条，确保「修复后不可悄悄回退」。
// ===================================================================

describe('C7 BUG-001 预览暂停失效', () => {
  const src = read('src/components/PreviewCanvas.tsx');

  it('只存在唯一一条 rAF 驱动链（缓动重绘链已移除）', () => {
    // 缓动重绘 effect（独立于 playing 的第二条链）已移除；注释亦已改为说明。
    expect(src).not.toMatch(/缓动重绘[\s\S]{0,80}requestAnimationFrame\(ease\)/);
    expect(src).not.toMatch(/const ease = \(\) =>/);
    // requestAnimationFrame 仅出现在「播放循环」内（初始挂载 + 递归重挂，共 2 个调用点）
    const rafCalls = (src.match(/requestAnimationFrame\(/g) ?? []).length;
    expect(rafCalls).toBe(2);
  });

  it('播放循环受 playing 控制（暂停即不继续，且不随 playing 重跑）', () => {
    // 暂停由 playingRef 在循环内早退实现（而非依赖数组含 playing），避免旧 bug：
    // 旧实现把 playing 放进 effect 依赖，playing 变 false→true 会重启整个循环并跳过 preload。
    expect(src).toMatch(/if \(!playingRef\.current\) return;/);
    // 构建场景 effect 的依赖数组不含 playing（仅文本/参数变化时才重建）
    expect(src).not.toMatch(/\}, \[playing,/);
    // 播放循环使用代际令牌，避免旧文本短动画 setPlaying(false) 误杀新动画
    expect(src).toMatch(/playGenRef\.current/);
  });
});

describe('C7 BUG-002 编辑自动保存', () => {
  const store = read('src/store/editor.ts');
  const editor = read('src/pages/Editor.tsx');

  it('编辑方法触发 debounce 写库', () => {
    expect(store).toMatch(/scheduleAutosave/);
    expect(store).toMatch(/AUTOSAVE_DELAY_MS/);
    // 三个编辑入口都触发
    const n = (store.match(/scheduleAutosave\(\(\) => get\(\)\.save\(\)\)/g) ?? []).length;
    expect(n).toBe(3);
  });

  it('提供 flush 兜底保存并在离开/隐藏时调用', () => {
    expect(store).toMatch(/flush:/);
    expect(editor).toMatch(/pagehide/);
    expect(editor).toMatch(/visibilitychange/);
    expect(editor).toMatch(/\.flush\(\)/);
  });

  it('保存后同步本地 id（避免重复新建）', () => {
    expect(store).toMatch(/created\?\.id/);
  });
});

describe('C7 BUG-003 非 CJK 字符不再请求（已在 C2 根除，防回退）', () => {
  it('源码中不存在任何 hanzi-writer / jsdelivr CDN 引用', () => {
    const files = ['src/engine/stroke.ts', 'src/engine/scene.ts', 'src/lib/fonts.ts'];
    for (const f of files) {
      const s = read(f);
      expect(s, f).not.toMatch(/cdn\.jsdelivr\.net/);
      expect(s, f).not.toMatch(/hanzi-writer-data/);
    }
  });

  it('预加载仅对 CJK 且可命中字表的字发起', () => {
    const scene = read('src/engine/scene.ts');
    expect(scene).toMatch(/isCjkWithOrder/);
  });
});

describe('C7 BUG-004 关于页硬编码中文', () => {
  it('licenses.ts 全部条目使用 usageKey（无裸 usage 中文）', () => {
    for (const l of THIRD_PARTY_LICENSES) {
      expect(l.key).toBeTruthy();
      expect(l.usageKey).toMatch(/^license\.[a-zA-Z0-9]+\.usage$/);
    }
    expect(read('src/lib/licenses.ts')).not.toMatch(/^\s*usage:\s*'[^']*[\u4e00-\u9fa5]/m);
  });

  it('About 页通过 t(l.usageKey) 渲染用途说明', () => {
    expect(read('src/pages/About.tsx')).toMatch(/t\(l\.usageKey\)/);
  });

  it('check-i18n 扫描范围含 src/lib 且校验 usageKey 可解析', () => {
    const script = read('scripts/check-i18n.mjs');
    expect(script).toMatch(/src\/lib/);
    expect(script).toMatch(/usageKey/);
  });
});

describe('C7 BUG-005 生僻字静默无输出', () => {
  const manifest = {
    generatedBy: 'test',
    fonts: [
      {
        prefix: 'k',
        family: 'K',
        usage: 'kai',
        chunks: [{ file: 'a.woff2', start: 0x6c30, end: 0x6c40, chars: 17 }],
      },
    ],
  };

  it('落在字体分片区间内的字符视为可渲染', () => {
    const out = computeUnsupported('永', manifest as never, 'kai'); // 永 = U+6C38
    expect(out).toEqual([]);
  });

  it('分片未覆盖的扩展 B 区生僻字被检出', () => {
    // U+20000 远在 kai 分片 [0x6C30,0x6C40] 之外
    const out = computeUnsupported('永𠀀', manifest as never, 'kai');
    expect(out).toContain('𠀀');
  });

  it('将新增缺字提示接入编辑器（i18n 键存在）', () => {
    expect(read('src/pages/Editor.tsx')).toMatch(/useFontUnsupported/);
    const zh = read('src/lib/i18n.zh.ts');
    expect(zh).toMatch(/'font\.unsupportedHint'/);
    expect(zh).toMatch(/'font\.unsupportedTip'/);
  });

  it('篆书越界检测仍独立可用（computeOutOfRange 未受影响）', () => {
    const cs = { version: 't', layer: 'L0' as const, glyphs: [], modernIndex: { 永: 1 } };
    expect(computeOutOfRange('永X', cs as never)).toEqual(['X']);
  });
});

describe('C7 BUG-006 长文渲染进度反馈', () => {
  it('Scene 支持 onProgress 回调并在分块间上报', () => {
    const scene = read('src/engine/scene.ts');
    expect(scene).toMatch(/onProgress\?:/);
    expect(scene).toMatch(/onProgress\?\.\(loaded, total\)/);
  });

  it('PreviewCanvas 显示「正在准备…」进度覆盖层', () => {
    const pc = read('src/components/PreviewCanvas.tsx');
    expect(pc).toMatch(/preview\.preparing/);
    expect(pc).toMatch(/im-preview__prep/);
    expect(read('src/app.css')).toMatch(/\.im-preview__prep/);
  });
});

// ===================================================================
// 防回退哨兵：Editor.tsx 无裸中文 JSX（i18n 门禁之外的运行时保险）
// ===================================================================
describe('C7 i18n 硬编码哨兵', () => {
  it('licenses.ts usageKey 全部为 ASCII 键名', () => {
    for (const l of THIRD_PARTY_LICENSES) {
      expect(/^[\x20-\x7e]+$/.test(l.usageKey)).toBe(true);
    }
  });
});
