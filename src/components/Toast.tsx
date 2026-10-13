import { create } from 'zustand';
import './components.css';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, message: string, ttl?: number) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (type, message, ttl = 3200) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    if (ttl > 0) {
      setTimeout(() => get().dismiss(id), ttl);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 命令式便捷调用：toast.success('已保存') */
export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error: (m: string) => useToastStore.getState().push('error', m),
  info: (m: string) => useToastStore.getState().push('info', m),
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="im-toast-wrap" role="region" aria-live="polite" aria-label="通知">
      {toasts.map((t) => (
        <div key={t.id} className={`im-toast im-toast--${t.type}`} role="status">
          <span className="im-toast__msg">{t.message}</span>
          <button
            className="im-modal__close"
            aria-label="关闭通知"
            onClick={() => dismiss(t.id)}
            style={{ fontSize: 16 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
