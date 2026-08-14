import React from 'react';

/** Surface container: neutral.800, 1px neutral.600 border, radius 16. */
export function Card({ children, raised, padding = 'var(--card-padding)', ambient, style, ...rest }) {
  return (
    <div
      style={{
        background: raised ? 'var(--surface-raised)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding,
        boxShadow: raised ? 'var(--shadow-card)' : 'var(--inset-hairline)',
        backgroundImage: ambient ? 'var(--ambient-carmine)' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
