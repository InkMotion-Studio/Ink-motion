import React from 'react';
import './components.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  onChange?: (value: string) => void;
}

export function Select({
  label,
  hint,
  error,
  required,
  options,
  value,
  onChange,
  id,
  className = '',
  ...rest
}: SelectProps) {
  const autoId = React.useId(); // V1-C5：无条件调用（rules-of-hooks）
  const selectId = id ?? autoId;
  const cls = ['im-select', error ? 'im-select--error' : '', className].filter(Boolean).join(' ');
  return (
    <div className="im-field">
      {label && (
        <label className="im-field__label" htmlFor={selectId}>
          {label}
          {required && <span className="im-field__req" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={cls}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange?.(e.target.value)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="im-field__error" role="alert">{error}</span>
      ) : hint ? (
        <span className="im-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
