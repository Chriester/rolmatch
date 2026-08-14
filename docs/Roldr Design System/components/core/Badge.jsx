import React from 'react';

const tones = {
  live: { background: 'var(--live)', color: 'var(--pure-white)' },
  neutral: { background: 'var(--surface-raised)', color: 'var(--text-muted)' },
  success: { background: 'rgba(63,191,143,.16)', color: 'var(--success)' },
  warning: { background: 'rgba(232,164,76,.16)', color: 'var(--warning)' },
  danger: { background: 'rgba(229,72,77,.16)', color: 'var(--danger)' },
};

/** Small status pill. "live" is reserved for games running right now. */
export function Badge({ children, tone = 'neutral', dot, style, ...rest }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 'var(--radius-pill)',
        font: 'var(--text-overline)', letterSpacing: 'var(--ls-overline)',
        textTransform: 'uppercase', ...tones[tone], ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}
