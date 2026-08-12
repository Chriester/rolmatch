// Marca Roldr — versión WEB. El logo y el wordmark (PNG del arte original)
// viven en brand-art.tsx, compartidos con nativo; aquí solo se define el
// texto con gradiente, que en web usa background-clip de CSS (el gotcha
// histórico eran los gradientes de react-native-svg en web).
// Mantener exports en paralelo con brand.tsx.

import { BRAND_CRIMSON, BRAND_PURPLE } from '@/components/brand-art';

export { BRAND_CRIMSON, BRAND_PURPLE, RolderBrand, RolderLogo, RolderWordmark } from '@/components/brand-art';

const GRADIENT = `linear-gradient(90deg, ${BRAND_CRIMSON}, ${BRAND_PURPLE})`;

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
