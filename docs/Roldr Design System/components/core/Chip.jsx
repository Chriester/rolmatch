import React from 'react';
import { Icon } from './Icon.jsx';

const tones = {
  default: { bg: 'var(--chip-bg)', bgOn: 'var(--chip-bg-active)', border: 'var(--chip-border)', borderOn: 'var(--chip-border-active)', fg: 'var(--text)' },
  live: { bg: 'var(--alpha-carmine-12)', bgOn: 'var(--alpha-carmine-20)', border: 'var(--alpha-carmine-40)', borderOn: 'var(--brand-carmine)', fg: '#FFB4CE' },
  success: { bg: 'rgba(63,191,143,.12)', bgOn: 'rgba(63,191,143,.28)', border: 'rgba(63,191,143,.4)', borderOn: 'rgba(63,191,143,.6)', fg: 'var(--success)' },
};

/** Filter / attribute chip. Alpha fill 12–28%, border 40–60%. */
export function Chip({ label, children, selected, tone = 'default', icon, onClick, style, ...rest }) {
  const t = tones[tone] || tones.default;
  const interactive = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={interactive ? !!selected : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--chip-padding-y) var(--chip-padding-x)',
        borderRadius: 'var(--radius-pill)',
        background: selected ? t.bgOn : t.bg,
        border: `1px solid ${selected ? t.borderOn : t.border}`,
        color: t.fg,
        font: 'var(--text-caption)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)',
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={13} />}
      {label || children}
    </button>
  );
}
