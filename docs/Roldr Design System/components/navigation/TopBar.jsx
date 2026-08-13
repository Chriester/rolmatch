import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Screen header. Shows the d20 mark on root screens, a back arrow deeper in. */
export function TopBar({ title, logoSrc, onBack, action, actionIcon, style, ...rest }) {
  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: '10px var(--screen-gutter)', minHeight: 56,
        background: 'rgba(10,9,12,.72)', backdropFilter: 'blur(var(--blur-glass))',
        ...style,
      }}
      {...rest}
    >
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Volver" style={{ background: 'transparent', border: 0, color: 'var(--text)', cursor: 'pointer', display: 'flex', padding: 4 }}>
          <Icon name="chevron-left" size={24} />
        </button>
      ) : logoSrc ? (
        <img src={logoSrc} alt="Roldr" style={{ height: 28, width: 28 }} />
      ) : null}
      <h1 style={{ font: 'var(--text-title-2)', flex: 1 }}>{title}</h1>
      {actionIcon && (
        <button type="button" onClick={action} style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}>
          <Icon name={actionIcon} size={22} />
        </button>
      )}
    </header>
  );
}
