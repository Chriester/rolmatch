// El arte de marca compartido entre plataformas: los PNG entregados TAL
// CUAL (logoicon: d20 icosaedro con la R y anillo orbital; logotext:
// wordmark «Roldr» con el dado como «o»). react-native Image renderiza
// <img> en web, así que estos componentes son idénticos en ambas; solo
// RolderGradientText necesita plataforma (ver brand.tsx / brand.web.tsx).

import { Image } from 'react-native';

// Gradiente de textos de marca (p. ej. «¡Es un match!») — sigue el arte.
export const BRAND_CRIMSON = '#DE1458';
export const BRAND_PURPLE = '#8E44AD';

// logoicon-ui es el mismo arte a 256px: el master de 2048 pesa 1 MB y en
// la UI nunca se pinta a más de ~80px (el master queda para los iconos).
// logotext-trim es el wordmark recortado a su caja real (el lienzo original
// trae ~74% de margen transparente que rompería el layout de cabeceras).
const LOGO_ICON = require('../../assets/logoicon-ui.png');
const LOGO_TEXT = require('../../assets/logotext-trim.png');
// caja real del wordmark recortado (1000×288)
const WORDMARK_RATIO = 1000 / 288;

/** El d20 orbital de la marca (logoicon.png, arte original) */
export function RolderLogo({ width = 24 }: { width?: number }) {
  return (
    <Image
      source={LOGO_ICON}
      style={{ width, height: width }}
      resizeMode="contain"
      accessibilityLabel="Logo de Roldr"
    />
  );
}

/** «Roldr» con el d20 como «o» (logotext.png, arte original) */
export function RolderWordmark({ size = 21 }: { size?: number }) {
  const height = size * 1.15;
  return (
    <Image
      source={LOGO_TEXT}
      style={{ width: height * WORDMARK_RATIO, height }}
      resizeMode="contain"
      accessibilityLabel="Roldr"
    />
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
