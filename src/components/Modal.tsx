import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/useI18n';
import './components.css';

export interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlay?: boolean;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  closeOnOverlay = true,
}: ModalProps) {
  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // 焦点陷阱：Tab 在对话框内循环（WCAG 2.1.2 无键盘陷阱的反面——模态内受限是允许的）
      if (e.key === 'Tab' && panel) {
        const focusables = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    // 打开时聚焦首个可聚焦元素
    const firstFocusable = panel?.querySelector<HTMLElement>(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
    );
    (firstFocusable ?? panel)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus?.(); // 关闭后焦点归位（WCAG 2.4.3）
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="im-modal__overlay"
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="im-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="im-modal__head">
          <h2 className="im-modal__title">{title}</h2>
          <button className="im-modal__close" aria-label={t('a11y.close')} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="im-modal__body">{children}</div>
        {footer && <div className="im-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
