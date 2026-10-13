import React from 'react';
import './components.css';

export interface SliderProps {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  format?: (v: number) => string;
  id?: string;
}

export function Slider({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  unit = '',
  format,
  id,
}: SliderProps) {
  const sliderId = id ?? React.useId();
  const display = format ? format(value) : `${value}${unit}`;
  return (
    <div className="im-slider">
      {label && (
        <div className="im-slider__head">
          <label htmlFor={sliderId} className="im-field__label">
            {label}
          </label>
          <span className="im-slider__value">{display}</span>
        </div>
      )}
      <input
        id={sliderId}
        className="im-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
