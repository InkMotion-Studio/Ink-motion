import React from 'react';
import './components.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function Card({ title, children, className = '', ...rest }: CardProps) {
  return (
    <div className={`im-card ${className}`} {...rest}>
      {title && <h3 className="im-card__title">{title}</h3>}
      {children}
    </div>
  );
}
