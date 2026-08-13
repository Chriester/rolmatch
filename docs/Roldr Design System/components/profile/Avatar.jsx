import React from 'react';

/** Circular player avatar; optional brand ring and live dot. */
export function Avatar({ src, name = '', size = 44, ring, live, style, ...rest }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flex: '0 0 auto', ...style }} {...rest}>
      <span
        style={{
          width: size, height: size, borderRadius: 'var(--radius-pill)',
          display: 'grid', placeItems: 'center', overflow: 'hidden',
          background: src ? 'var(--surface-raised)' : 'var(--gradient-brand)',
          color: 'var(--pure-white)', font: `var(--fw-bold) ${Math.round(size * 0.36)}px var(--font-display)`,
          padding: ring ? 2 : 0,
          boxShadow: ring ? '0 0 0 2px var(--brand-lilac)' : 'var(--inset-hairline)',
        }}
      >
        {src
          ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          : initials}
      </span>
      {live && (
        <span style={{
          position: 'absolute', right: -1, bottom: -1, width: size * 0.26, height: size * 0.26,
          borderRadius: '50%', background: 'var(--live)', border: '2px solid var(--bg)',
        }} />
      )}
    </span>
  );
}
