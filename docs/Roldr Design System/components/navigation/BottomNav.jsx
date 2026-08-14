import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Fixed 5-slot app tab bar with glass blur over the dark background. */
export function BottomNav({ items = [], active = 0, onChange, style, ...rest }) {
  return (
    <nav
      style={{
        display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr',
        alignItems: 'center', height: 'var(--bottom-nav-height)',
        background: 'rgba(19,17,25,.86)', backdropFilter: 'blur(var(--blur-glass))',
        borderTop: '1px solid var(--border)', ...style,
      }}
      {...rest}
    >
      {items.map((it, i) => {
        const on = i === active;
        return (
          <button
            key={it.label}
            type="button"
            onClick={() => onChange && onChange(i)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 0, cursor: 'pointer', padding: 6,
              color: on ? 'var(--brand-lilac)' : 'var(--text-muted)',
              font: 'var(--text-overline)', letterSpacing: '.02em',
              transition: 'color var(--dur-fast) var(--ease-standard)',
            }}
          >
            <Icon name={it.icon} size={22} />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
