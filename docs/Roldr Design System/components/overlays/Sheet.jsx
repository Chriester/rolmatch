import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Bottom sheet: scrim + surface panel, radius 24 on the top corners only. */
export function Sheet({ open, title, onClose, children, style, ...rest }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', zIndex: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', backdropFilter: 'blur(2px)' }} />
      <section
        style={{
          position: 'relative', width: '100%',
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: 'var(--sheet-padding)', boxShadow: 'var(--shadow-sheet)',
          animation: `roldr-sheet-in var(--dur-base) var(--ease-out)`,
          ...style,
        }}
        {...rest}
      >
        <span style={{ display: 'block', width: 36, height: 4, borderRadius: 999, background: 'var(--border-strong)', margin: '0 auto var(--space-4)' }} />
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ font: 'var(--text-title-1)', flex: 1 }}>{title}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'var(--surface-raised)', border: 0, borderRadius: 'var(--radius-pill)', width: 32, height: 32, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
        {children}
        <style>{'@keyframes roldr-sheet-in{from{transform:translateY(14px);opacity:.6}to{transform:none;opacity:1}}'}</style>
      </section>
    </div>
  );
}
