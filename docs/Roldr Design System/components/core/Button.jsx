import React from 'react';
import { Icon } from './Icon.jsx';

const base = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 'var(--space-2)', border: 0, cursor: 'pointer',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--btn-padding-y) var(--btn-padding-x)',
  font: 'var(--fw-semibold) var(--fs-body)/1 var(--font-body)',
  minHeight: 'var(--tap-min)',
  transition: 'transform var(--dur-fast) var(--ease-standard), filter var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)',
};

const variants = {
  primary: { background: 'var(--gradient-brand)', color: 'var(--text-on-brand)', fontWeight: 'var(--fw-bold)', boxShadow: 'var(--glow-brand)' },
  secondary: { background: 'var(--surface-raised)', color: 'var(--text)', boxShadow: 'var(--inset-hairline)' },
  ghost: { background: 'transparent', color: 'var(--text)' },
  danger: { background: 'transparent', color: 'var(--danger)', boxShadow: 'inset 0 0 0 1px rgba(229,72,77,.4)' },
};

const sizes = {
  sm: { padding: '8px 14px', fontSize: 'var(--fs-caption)', minHeight: 36 },
  md: {},
  lg: { padding: '15px 22px', fontSize: 'var(--fs-body-lg)' },
};

/** Roldr button. One gradient (primary) CTA per screen — never two. */
export function Button({
  variant = 'primary', size = 'md', icon, iconRight, fullWidth,
  disabled, children, style, ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  return (
    <button
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHover(false); }}
      onPointerEnter={() => setHover(true)}
      style={{
        ...base, ...variants[variant], ...sizes[size],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : undefined,
        filter: hover && !pressed ? 'brightness(1.08)' : undefined,
        background: hover && variant === 'ghost' ? 'var(--alpha-white-08)' : (variants[variant].background),
        transform: pressed ? 'scale(var(--press-scale))' : 'none',
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 18} />}
    </button>
  );
}
