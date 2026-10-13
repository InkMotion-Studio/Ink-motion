import React from 'react';
import './components.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  loading,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const cls = [
    'im-btn',
    `im-btn--${variant}`,
    `im-btn--${size}`,
    block ? 'im-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      className={cls}
      disabled={disabled || loading}
      aria-disabled={disabled || loading || undefined}
      {...rest}
    >
      {loading && <span className="im-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
