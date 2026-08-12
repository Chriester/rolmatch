// Marca Roldr (arte 2026-08 v3): logoicon.png (d20 icosaedro con la R y
// anillo orbital) y logotext.png (wordmark «Roldr» con el dado como «o»).
// Son los PNG entregados TAL CUAL — no se recrean en SVG; logotext-trim.png
// es el mismo arte recortado a su caja real (el lienzo original trae ~74%
// de margen transparente que rompería el layout de las cabeceras).
// Mantener exports en paralelo con brand.web.tsx.

import { Image } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useId } from 'react';

// Gradiente de textos de marca (p. ej. «¡Es un match!») — sigue el arte.
export const BRAND_CRIMSON = '#DE1458';
export const BRAND_PURPLE = '#8E44AD';

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
  // id único por instancia: con id fijo, durante la transición de ruta
  // conviven dos <defs> iguales y al desmontarse el viejo el url(#...) se
  // rompe (texto invisible hasta recargar)
  const textId = `roldr-gtext-${useId().replace(/:/g, '')}`;
  const width = Math.max(text.length * size * 0.62, size * 4);
  const height = size * 1.4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgGradient id={textId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={BRAND_CRIMSON} />
          <Stop offset="1" stopColor={BRAND_PURPLE} />
        </SvgGradient>
      </Defs>
      <SvgText
        x={width / 2}
        y={size * 1.05}
        fill={`url(#${textId})`}
        fontFamily="Sora_800ExtraBold"
        fontSize={size}
        fontWeight="800"
        textAnchor="middle">
        {text}
      </SvgText>
    </Svg>
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
