import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Text field on surface-raised with a lilac focus ring. */
export function Input({ label, hint, icon, error, style, id, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const fieldId = id || React.useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {label && (
        <label htmlFor={fieldId} style={{ font: 'var(--text-caption)', color: 'var(--text-muted)' }}>{label}</label>
      )}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          background: 'var(--surface-raised)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0 14px', minHeight: 'var(--tap-min)',
          boxShadow: focus ? `0 0 0 var(--focus-ring-width) var(--focus-ring)` : 'none',
          transition: 'box-shadow var(--dur-fast) var(--ease-standard)',
          ...style,
        }}
      >
        {icon && <span style={{ color: 'var(--text-muted)', display: 'flex' }}><Icon name={icon} size={16} /></span>}
        <input
          id={fieldId}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, background: 'transparent', border: 0, outline: 'none',
            color: 'var(--text)', font: 'var(--text-body)', padding: '12px 0',
          }}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <span style={{ font: 'var(--text-caption)', color: error ? 'var(--danger)' : 'var(--text-muted)' }}>{error || hint}</span>
      )}
    </div>
  );
}
