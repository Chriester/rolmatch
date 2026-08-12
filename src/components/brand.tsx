// Marca Roldr — versión NATIVA. El logo y el wordmark (PNG del arte
// original) viven en brand-art.tsx, compartidos con web; aquí solo se
// define el texto con gradiente, que en nativo va por react-native-svg.
// Mantener exports en paralelo con brand.web.tsx.

import { useId } from 'react';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { BRAND_CRIMSON, BRAND_PURPLE } from '@/components/brand-art';

export { BRAND_CRIMSON, BRAND_PURPLE, RolderBrand, RolderLogo, RolderWordmark } from '@/components/brand-art';

/** Texto arbitrario con el gradiente de marca (p. ej. «¡Es un match!») */
export function RolderGradientText({ text, size = 34 }: { text: string; size?: number }) {
  // id único por instancia: con id fijo, durante la transición de ruta
  // conviven dos <defs> iguales y al desmontarse el viejo el url(#...) se
  // rompe (texto invisible hasta recargar). OJO: useId en React 19 devuelve
  // «r0» (guillemetes, ya no :r0:) — se filtra todo lo no alfanumérico.
  const textId = `roldr-gtext-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
