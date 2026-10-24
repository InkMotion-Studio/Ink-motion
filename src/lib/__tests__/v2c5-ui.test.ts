import { describe, it, expect } from 'vitest';
import { containSize } from '@/lib/useElementSize';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const readApp = () => readFileSync(resolve(root, 'src/app.css'), 'utf-8');
const readComponents = () => readFileSync(resolve(root, 'src/components/components.css'), 'utf-8');

describe('V2-C5 N5.1 预览等比缩放', () => {
  it('containSize：竖屏 9:16 在宽扁容器内按高度贴合', () => {
    // 容器 800×400，画布 1080×1920 → 缩放受高度限制
    const s = containSize(800, 400, 1080, 1920);
    expect(s.height).toBe(400);
    expect(s.width).toBe(Math.floor((1080 * 400) / 1920)); // 225
  });

  it('containSize：横屏 16:9 在宽扁容器内按高度贴合（旧硬编码 9/16 会算错）', () => {
    // 容器 800×400，画布 1920×1080（16:9 横屏）
    // 若按宽度 800 缩放 → 高 450 > 400 会溢出；正确做法是受高度约束
    const s = containSize(800, 400, 1920, 1080);
    expect(s.height).toBe(400);
    expect(s.width).toBe(Math.floor((1920 * 400) / 1080)); // 711
    // 旧硬编码 9:16 时高会被算成 800*(16/9)=1422，远超容器 —— 明确区别于新逻辑
    expect(s.width).toBeLessThanOrEqual(800);
  });

  it('containSize：等比不变形（宽高比保持）', () => {
    const s = containSize(500, 900, 1080, 1920);
    const srcRatio = 1080 / 1920;
    const dstRatio = s.width / s.height;
    expect(Math.abs(srcRatio - dstRatio)).toBeLessThan(0.01);
  });

  it('containSize：容器为 0 时返回 0（首帧未测量不绘制尺寸）', () => {
    expect(containSize(0, 0, 1080, 1920)).toEqual({ width: 0, height: 0 });
    expect(containSize(100, 100, 0, 0)).toEqual({ width: 0, height: 0 });
  });

  it('PreviewCanvas 不再硬编码 9/16，改为由画布规格驱动 data-ratio', () => {
    const src = readFileSync(resolve(root, 'src/components/PreviewCanvas.tsx'), 'utf-8');
    expect(src).not.toMatch(/aspectRatio:\s*'9\s*\/\s*16'/);
    expect(src).toMatch(/data-ratio=/);
    expect(src).toMatch(/containSize\(/);
    expect(src).toMatch(/useElementSize/);
  });

  it('预览舞台样式改为容器实测驱动（stagewrap 用 grid 居中、无固定 max-width:360px）', () => {
    const css = readApp();
    expect(css).toMatch(/\.im-preview__stagewrap/);
    expect(css).toMatch(/place-items:\s*center/);
    // 旧的固定宽度写法必须已被移除
    expect(css).not.toMatch(/\.im-preview__stage\s*\{[^}]*max-width:\s*360px/);
  });
});

describe('V2-C5 N5.1 编辑器三栏与断点', () => {
  it('三栏网格存在且左/中/右三栏具备语义类名', () => {
    const src = readFileSync(resolve(root, 'src/pages/Editor.tsx'), 'utf-8');
    expect(src).toMatch(/im-editor__pane--body/);
    expect(src).toMatch(/im-editor__pane--preview/);
    expect(src).toMatch(/im-editor__pane--options/);
    expect(src).toMatch(/im-editor__grid/);
  });

  it('断点覆盖 1440 / 1200 / 900 三档', () => {
    const css = readApp();
    expect(css).toMatch(/@media \(min-width: 1440px\)/);
    expect(css).toMatch(/@media \(max-width: 1200px\)/);
    expect(css).toMatch(/@media \(max-width: 899px\)/);
  });

  it('1200 以下用 grid-template-areas 把预览置顶', () => {
    const css = readApp();
    expect(css).toMatch(/grid-template-areas:/);
    expect(css).toMatch(/'preview preview'/);
  });

  it('左栏正文与右栏参数均可折叠（含持久化键）', () => {
    const src = readFileSync(resolve(root, 'src/pages/Editor.tsx'), 'utf-8');
    expect(src).toMatch(/im\.editor\.bodyOpen/);
    expect(src).toMatch(/im\.editor\.optionsOpen/);
    expect(src).toMatch(/im-editor__rail/);
  });

  it('折叠态暴露 aria-expanded 供无障碍与 E2E 断言', () => {
    const src = readFileSync(resolve(root, 'src/pages/Editor.tsx'), 'utf-8');
    expect(src).toMatch(/aria-expanded=\{bodyOpen\}/);
    expect(src).toMatch(/aria-expanded=\{optionsOpen\}/);
  });
});

describe('V2-C5 N5.2 参数面板手风琴', () => {
  it('OptionsPanel 六个分组全部走 Collapsible', () => {
    const src = readFileSync(resolve(root, 'src/components/OptionsPanel.tsx'), 'utf-8');
    const count = (src.match(/<Collapsible/g) || []).length;
    expect(count).toBe(6);
    expect(src).toMatch(/OPTION_GROUPS/);
  });

  it('手风琴分组键与规划一致（carrier/font/write/scroll/canvas/animation）', () => {
    const src = readFileSync(resolve(root, 'src/components/OptionsPanel.tsx'), 'utf-8');
    for (const k of ['carrier', 'font', 'write', 'scroll', 'canvas', 'animation']) {
      expect(src).toMatch(new RegExp(`'${k}'`));
    }
  });

  it('每组标题带取值摘要（收起时仍可读）', () => {
    const src = readFileSync(resolve(root, 'src/components/OptionsPanel.tsx'), 'utf-8');
    const count = (src.match(/summary=/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it('Collapsible 用原生 button + aria-expanded/aria-controls（键盘可达）', () => {
    const src = readFileSync(resolve(root, 'src/components/Collapsible.tsx'), 'utf-8');
    expect(src).toMatch(/<button/);
    expect(src).toMatch(/aria-expanded=\{open\}/);
    expect(src).toMatch(/aria-controls=\{bodyId\}/);
    expect(src).toMatch(/hidden=\{!open\}/);
  });

  it('收起时不卸载子树（避免 Select/Slider 焦点与取值被重置）', () => {
    const src = readFileSync(resolve(root, 'src/components/Collapsible.tsx'), 'utf-8');
    // 必须是 hidden 控制显隐，而不是条件渲染 {open && ...}
    expect(src).toMatch(/hidden=\{!open\}/);
    expect(src).not.toMatch(/\{open && \(/);
  });

  it('折叠分组样式已定义（含警示 tone）', () => {
    const css = readComponents();
    expect(css).toMatch(/\.im-collapsible__toggle/);
    expect(css).toMatch(/\.im-collapsible__summary/);
    expect(css).toMatch(/\.im-collapsible--warn/);
  });

  it('受限字库提示已内联到字体分组低位（im-options__inner）', () => {
    const src = readFileSync(resolve(root, 'src/components/OptionsPanel.tsx'), 'utf-8');
    expect(src).toMatch(/im-options__inner/);
    expect(src).toMatch(/<SealCharsetPanel/);
    expect(src).toMatch(/<LiCharsetPanel/);
  });
});
