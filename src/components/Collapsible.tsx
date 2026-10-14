import React, { useId, useState } from 'react';
import './components.css';

export interface CollapsibleProps {
  /** 分组标题（同时作为可点击的折叠开关） */
  title: string;
  /** 分组键：用于在包裹层上标注 `data-group`，便于样式与测试定位 */
  groupKey?: string;
  /** 兼容旧版 `fieldset.im-options__group` 选择器（V2-C5：手风琴改造后仍保留该包裹层） */
  legacyFieldset?: boolean;
  /** 初始是否展开（默认展开，便于首次使用不被隐藏） */
  defaultOpen?: boolean;
  /** 受控展开态（传入后由外部接管） */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  /** 标题右侧的摘要信息（收起时也能一眼看到当前取值） */
  summary?: React.ReactNode;
  /** V2-C5 N5.2：分组内出现问题时在标题上挂警示角标 */
  tone?: 'default' | 'warn';
  children: React.ReactNode;
}

/**
 * V2-C5 N5.2：可折叠分组容器（手风琴）。
 *
 * 设计取舍：用**原生 button + aria-expanded/aria-controls**，不用 <details>，
 * 以便精确控制动画、标题右侧摘要与警示角标；键盘可达性与读屏语义等价。
 * 收起时**不卸载**子树（用 hidden 属性），避免 Select/Slider 的焦点与取值被重置——
 * 这对以"参数面板"为主体的编辑器很关键。
 *
 * 向后兼容：`legacyFieldset` 为真时，外层仍渲染 `fieldset.im-options__group` + `legend`，
 * 使既有 E2E 的 `.im-options__group >> nth=N >> select` 定位继续可用（顺序语义不变）。
 */
export function Collapsible({
  title,
  groupKey,
  legacyFieldset = false,
  defaultOpen = true,
  open: openProp,
  onToggle,
  summary,
  tone = 'default',
  children,
}: CollapsibleProps) {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const bodyId = useId();

  const toggle = () => {
    const next = !open;
    if (openProp === undefined) setInner(next);
    onToggle?.(next);
  };

  const inner_node = (
    <>
      <h4 className="im-collapsible__head">
        <button
          type="button"
          className="im-collapsible__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={toggle}
        >
          <span className="im-collapsible__arrow" aria-hidden="true">
            ▸
          </span>
          <span className="im-collapsible__title">{title}</span>
          {summary !== undefined && <span className="im-collapsible__summary">{summary}</span>}
        </button>
      </h4>
      <div id={bodyId} className="im-collapsible__body" hidden={!open}>
        {children}
      </div>
    </>
  );

  if (legacyFieldset) {
    return (
      <fieldset
        className={`im-options__group im-collapsible${open ? ' is-open' : ''}${
          tone === 'warn' ? ' im-collapsible--warn' : ''
        }`}
        data-open={open ? 'true' : 'false'}
        data-group={groupKey}
      >
        <legend className="im-visually-hidden">{title}</legend>
        {inner_node}
      </fieldset>
    );
  }

  return (
    <section
      className={`im-collapsible${open ? ' is-open' : ''}${
        tone === 'warn' ? ' im-collapsible--warn' : ''
      }`}
      data-open={open ? 'true' : 'false'}
      data-group={groupKey}
    >
      {inner_node}
    </section>
  );
}
