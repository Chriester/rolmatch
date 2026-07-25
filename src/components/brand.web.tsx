// Marca rolder — versión WEB en CSS puro (clip-path + background-clip),
// idéntica al prototipo del handoff. Los gradientes SVG de react-native-svg
// no renderizan en web, así que aquí no se usa SVG; la versión nativa (SVG)
// vive en brand.tsx. Mantener los exports de ambos archivos en paralelo.

import { Rolder } from '@/constants/theme';

const GRADIENT = `linear-gradient(135deg, ${Rolder.coral}, ${Rolder.violet})`;
const SORA = 'Sora_800ExtraBold, Sora, sans-serif';
const HEX_CLIP = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)';

/** Hexágono d20 con «20» centrado — el icono de la app */
export function RolderLogo({ width = 24 }: { width?: number }) {
  const height = (width * 48) / 44;
  return (
    <div
      style={{
        width,
        height,
        background: GRADIENT,
        clipPath: HEX_CLIP,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontFamily: SORA,
        fontWeight: 800,
        fontSize: Math.round(width * 0.4),
        flexShrink: 0,
      }}>
      20
    </div>
  );
}

/** «rolder» en Sora 800 con gradiente coral→violeta */
export function RolderWordmark({ size = 21 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: SORA,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: '-0.02em',
        backgroundImage: GRADIENT,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        lineHeight: 1.2,
        userSelect: 'none',
      }}>
      rolder
    </span>
  );
}

/** Texto arbitrario con el gradiente de marca (p. ej. «¡Es un match!») */
export function RolderGradientText({ text, size = 34 }: { text: string; size?: number }) {
  return (
    <span
      style={{
        fontFamily: SORA,
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

/** Logo + wordmark en fila, el lockup de las cabeceras */
export function RolderBrand({
  logoWidth = 24,
  wordmarkSize = 21,
}: {
  logoWidth?: number;
  wordmarkSize?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <RolderLogo width={logoWidth} />
      <RolderWordmark size={wordmarkSize} />
    </div>
  );
}
