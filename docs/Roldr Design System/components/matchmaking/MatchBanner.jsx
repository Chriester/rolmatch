import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Full-bleed "¡Mesa encontrada!" celebration overlay. */
export function MatchBanner({ title, gm, onOpen, onKeep, style, ...rest }) {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'var(--scrim)', backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center',
        backgroundImage: 'var(--ambient-carmine)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: 84, height: 84, borderRadius: 'var(--radius-pill)', background: 'var(--gradient-brand)', display: 'grid', placeItems: 'center', color: 'var(--pure-white)', boxShadow: 'var(--glow-brand)', animation: 'roldr-pop var(--dur-slow) var(--ease-dice)' }}>
        <Icon name="dices" size={40} />
      </span>
      <h2 style={{ font: 'var(--text-display-2)', letterSpacing: 'var(--ls-display)' }}>¡Mesa encontrada!</h2>
      <p style={{ font: 'var(--text-body)', color: 'var(--text-muted)', maxWidth: 260 }}>
        {gm} te ha guardado sitio en <strong style={{ color: 'var(--text)' }}>{title}</strong>.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%', maxWidth: 260 }}>
        <button type="button" onClick={onOpen} style={{ background: 'var(--gradient-brand)', color: 'var(--pure-white)', border: 0, borderRadius: 'var(--radius-md)', padding: 'var(--btn-padding-y) var(--btn-padding-x)', font: 'var(--fw-bold) var(--fs-body)/1 var(--font-body)', cursor: 'pointer', minHeight: 'var(--tap-min)' }}>Abrir la mesa</button>
        <button type="button" onClick={onKeep} style={{ background: 'transparent', color: 'var(--text-muted)', border: 0, font: 'var(--text-caption)', cursor: 'pointer', minHeight: 'var(--tap-min)' }}>Seguir buscando</button>
      </div>
      <style>{'@keyframes roldr-pop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}'}</style>
    </div>
  );
}
