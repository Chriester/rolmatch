import React from 'react';
import { Icon } from '../core/Icon.jsx';

const circle = (size, bg, fg, shadow) => ({
  width: size, height: size, borderRadius: 'var(--radius-pill)',
  display: 'grid', placeItems: 'center', border: 0, cursor: 'pointer',
  background: bg, color: fg, boxShadow: shadow,
  transition: 'transform var(--dur-fast) var(--ease-dice), filter var(--dur-fast) var(--ease-standard)',
});

/** Pass / superlike / join row under the swipe deck. */
export function SwipeActions({ onNo, onSuper, onYes, style, ...rest }) {
  const [down, setDown] = React.useState(null);
  const press = k => ({
    onPointerDown: () => setDown(k),
    onPointerUp: () => setDown(null),
    onPointerLeave: () => setDown(null),
    style: { transform: down === k ? 'scale(.92)' : 'none' },
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-5)', ...style }} {...rest}>
      <button type="button" aria-label="Pasar" onClick={onNo} {...press('no')}
        style={{ ...circle(56, 'var(--surface-raised)', 'var(--danger)', 'var(--shadow-sm)'), ...press('no').style }}>
        <Icon name="x" size={24} />
      </button>
      <button type="button" aria-label="Guardar para luego" onClick={onSuper} {...press('super')}
        style={{ ...circle(48, 'var(--alpha-lilac-12)', 'var(--brand-lilac)', 'var(--glow-accent)'), ...press('super').style }}>
        <Icon name="bookmark" size={20} />
      </button>
      <button type="button" aria-label="Unirme" onClick={onYes} {...press('yes')}
        style={{ ...circle(64, 'var(--gradient-brand)', 'var(--pure-white)', 'var(--glow-brand)'), ...press('yes').style }}>
        <Icon name="dices" size={28} />
      </button>
    </div>
  );
}
