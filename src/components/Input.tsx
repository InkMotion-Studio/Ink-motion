import React from 'react';
import './components.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export function Input({
  label,
  hint,
  error,
  required,
  id,
  className = '',
  ...rest
}: InputProps) {
  // V1-C5：useId 必须无条件调用（react-hooks/rules-of-hooks），再与显式 id/name 合并
  const autoId = React.useId();
  const inputId = id ?? rest.name ?? autoId;
  const cls = ['im-input', error ? 'im-input--error' : '', className].filter(Boolean).join(' ');
  return (
    <div className="im-field">
      {label && (
        <label className="im-field__label" htmlFor={inputId}>
          {label}
          {required && <span className="im-field__req" aria-hidden="true">*</span>}
        </label>
      )}
      <input id={inputId} className={cls} aria-invalid={error ? true : undefined} {...rest} />
      {error ? (
        <span className="im-field__error" role="alert">{error}</span>
      ) : hint ? (
        <span className="im-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
