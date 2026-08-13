import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Chip } from '../core/Chip.jsx';
import { Badge } from '../core/Badge.jsx';
import { Avatar } from '../profile/Avatar.jsx';

/** The table card in the swipe deck: full-bleed art, bottom protection gradient, meta. */
export function SwipeCard({
  title, system, gm, gmPhoto, imageUrl, tags = [], distance, seats, live,
  offset = 0, decision, style, ...rest
}) {
  const tint = decision === 'yes' ? 'var(--swipe-yes)' : decision === 'no' ? 'var(--swipe-no)' : null;
  return (
    <article
      style={{
        position: 'absolute', inset: 0,
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-swipe)',
        transform: `translateY(${offset * 10}px) scale(${1 - offset * 0.04})`,
        transition: 'transform var(--dur-card) var(--ease-out), opacity var(--dur-card) var(--ease-out)',
        ...style,
      }}
      {...rest}
    >
      {imageUrl
        ? <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.9) contrast(1.05)' }} />
        : <div style={{ position: 'absolute', inset: 0, background: 'var(--gradient-brand)', opacity: .55 }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--scrim-bottom)' }} />
      {tint && <div style={{ position: 'absolute', inset: 0, background: tint, opacity: .18 }} />}

      <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', gap: 8 }}>
        {live && <Badge tone="live" dot>En directo</Badge>}
        {seats != null && <Badge tone="success">{seats} plazas</Badge>}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--brand-lilac)', font: 'var(--text-dice)' }}>
          <Icon name="dices" size={14} />{system}
        </div>
        <h2 style={{ font: 'var(--text-display-2)', letterSpacing: 'var(--ls-display)', textWrap: 'pretty' }}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', font: 'var(--text-caption)' }}>
          <Avatar name={gm} src={gmPhoto} size={26} ring />
          <span>{gm}</span>
          {distance && <><span>·</span><Icon name="map-pin" size={13} /><span>{distance}</span></>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {tags.map(t => <Chip key={t} label={t} />)}
        </div>
      </div>
    </article>
  );
}
