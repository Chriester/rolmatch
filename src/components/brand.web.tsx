// Marca Roldr — versión WEB. Logo y wordmark son los mismos PNG del arte
// original que en brand.tsx (react-native Image renderiza <img> en web);
// solo el texto con gradiente difiere: aquí usa background-clip de CSS
// (el gotcha histórico eran los gradientes de react-native-svg en web).
// Mantener exports en paralelo con brand.tsx.

import { Image } from 'react-native';

export const BRAND_CRIMSON = '#DE1458';
export const BRAND_PURPLE = '#8E44AD';

const GRADIENT = `linear-gradient(90deg, ${BRAND_CRIMSON}, ${BRAND_PURPLE})`;

// logoicon-ui es el mismo arte a 256px: el master de 2048 pesa 1 MB y en
// la UI nunca se pinta a más de ~80px (el master queda para los iconos)
const LOGO_ICON = require('../../assets/logoicon-ui.png');
const LOGO_TEXT = require('../../assets/logotext-trim.png');
// caja real del wordmark recortado (1000×288)
const WORDMARK_RATIO = 1000 / 288;

/** El d20 orbital de la marca (logoicon.png, arte original) */
export function RolderLogo({ width = 24 }: { width?: number }) {
  return <Image source={LOGO_ICON} style={{ width, height: width }} resizeMode="contain" />;
}

/** «Roldr» con el d20 como «o» (logotext.png, arte original) */
export function RolderWordmark({ size = 21 }: { size?: number }) {
  const height = size * 1.15;
  return (
    <Image
      source={LOGO_TEXT}
      style={{ width: height * WORDMARK_RATIO, height }}
      resizeMode="contain"
    />
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
