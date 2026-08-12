// Marca Roldr — versión WEB. El dado usa <svg> del DOM (los gradientes del
// navegador funcionan; el gotcha era react-native-svg) y las letras son
// spans con color sólido. La versión nativa vive en brand.tsx — mantener
// los exports de ambos archivos en paralelo.

import { type CSSProperties } from 'react';

import { Rolder } from '@/constants/theme';

export const BRAND_CRIMSON = '#DE1458';
export const BRAND_PURPLE = '#8E44AD';
const DIE_FROM = '#F50747';
const DIE_TO = '#7A4FC0';

const GRADIENT = `linear-gradient(90deg, ${BRAND_CRIMSON}, ${BRAND_PURPLE})`;
// Las letras del wordmark van en Poppins (geométrica) — el arte de marca
// 2026-08 no es Sora, que sigue siendo la fuente del resto de la UI.
const WORDMARK_FONT = 'Poppins_600SemiBold, Poppins, sans-serif';

/** El d20 de facetas — icono de la marca (la «o» del wordmark) */
export function RolderLogo({ width = 24, line }: { width?: number; line?: string }) {
  const height = (width * 48) / 44;
  const stroke = line ?? Rolder.page;
  const joint = Math.max(1.4, width * 0.055);
  return (
    <svg width={width} height={height} viewBox="0 0 44 48" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="roldr-die-web" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={DIE_FROM} />
          <stop offset="1" stopColor={DIE_TO} />
        </linearGradient>
      </defs>
      <polygon points="22,1 43,13 43,35 22,47 1,35 1,13" fill="url(#roldr-die-web)" />
      <polygon
        points="22,1 43,35 1,35"
        fill="none"
        stroke={stroke}
        strokeWidth={joint}
        strokeLinejoin="round"
      />
      <polygon
        points="1,13 43,13 22,47"
        fill="none"
        stroke={stroke}
        strokeWidth={joint}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * El d20 con su anillo orbital — la versión «planeta» del arte de marca
 * (roldr-logo-v2). El anillo pasa por detrás del dado arriba a la derecha
 * y por delante abajo a la izquierda; las juntas de las facetas van en el
 * color del fondo, como recortadas.
 */
export function RolderDieOrbit({ width = 64, line }: { width?: number; line?: string }) {
  const height = (width * 64) / 72;
  const stroke = line ?? Rolder.page;
  return (
    <svg width={width} height={height} viewBox="0 0 72 64" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="roldr-orbit-die-web" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={DIE_FROM} />
          <stop offset="1" stopColor={DIE_TO} />
        </linearGradient>
        <linearGradient id="roldr-orbit-ring-web" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={BRAND_CRIMSON} />
          <stop offset="1" stopColor={BRAND_PURPLE} />
        </linearGradient>
      </defs>
      <g transform="translate(36,32) rotate(-16)">
        <path
          d="M -34 0 A 34 11 0 0 1 34 0"
          fill="none"
          stroke="url(#roldr-orbit-ring-web)"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.9}
        />
      </g>
      <polygon points="36,8 55,19 55,45 36,56 17,45 17,19" fill="url(#roldr-orbit-die-web)" />
      <polygon
        points="36,8 55,45 17,45"
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <polygon
        points="17,19 55,19 36,56"
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <g transform="translate(36,32) rotate(-16)">
        <path
          d="M 34 0 A 34 11 0 0 1 -34 0"
          fill="none"
          stroke="url(#roldr-orbit-ring-web)"
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** «Roldr» con el d20 como «o» — carmesí a la izquierda, púrpura a la derecha */
export function RolderWordmark({ size = 21 }: { size?: number }) {
  const letter = (color: string): CSSProperties => ({
    fontFamily: WORDMARK_FONT,
    fontWeight: 600,
    fontSize: size,
    letterSpacing: '-0.02em',
    color,
    lineHeight: 1.2,
    userSelect: 'none',
  });
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.13 }}>
      <span style={letter(BRAND_CRIMSON)}>R</span>
      <RolderLogo width={size * 0.92} />
      <span style={letter(BRAND_PURPLE)}>ldr</span>
    </span>
  );
}

/** Texto arbitrario con el gradiente de marca (p. ej. «¡Es un match!») */
export function RolderGradientText({ text, size = 34 }: { text: string; size?: number }) {
  return (
    <span
      style={{
        fontFamily: 'Sora_800ExtraBold, Sora, sans-serif',
        fontWeight: 800,
        fontSize: size,
        backgroundImage: GRADIENT,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        lineHeight: 1.3,
        textAlign: 'center',
      }}>
      {text}
    </span>
  );
}

/** El lockup de las cabeceras: ahora es el propio wordmark (dado integrado) */
export function RolderBrand({
  logoWidth: _logoWidth = 24,
  wordmarkSize = 21,
}: {
  logoWidth?: number;
  wordmarkSize?: number;
}) {
  return <RolderWordmark size={wordmarkSize + 3} />;
}
