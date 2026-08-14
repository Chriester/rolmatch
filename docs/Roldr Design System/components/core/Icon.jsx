import React from 'react';

const CDN = 'https://unpkg.com/lucide-static@0.428.0/icons';

/** Lucide (CDN) glyph tinted with currentColor via CSS mask. */
export function Icon({ name, size = 20, style, title, ...rest }) {
  const url = `${CDN}/${name}.svg`;
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      style={{
        display: 'inline-block', flex: '0 0 auto', width: size, height: size,
        background: 'currentColor',
        WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        WebkitMaskSize: 'contain', maskSize: 'contain',
        ...style,
      }}
      {...rest}
    />
  );
}
