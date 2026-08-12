// Marca Roldr (logo 2026-08): wordmark «R⟐ldr» con el d20 de facetas como
// «o», en gradiente carmesí→púrpura. El dado es SVG (react-native-svg);
// las letras son <Text> planos porque sus colores son sólidos — así la
// versión web (brand.web.tsx) comparte forma. Mantener exports en paralelo.

import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Polygon,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Rolder } from '@/constants/theme';

// Gradiente propio del logo — más profundo que los acentos coral/violeta
// de la UI, que no cambian.
export const BRAND_CRIMSON = '#DE1458';
export const BRAND_PURPLE = '#8E44AD';
const DIE_FROM = '#F50747';
const DIE_TO = '#7A4FC0';

// Las letras del wordmark van en Poppins (geométrica: cuencos circulares,
// pata recta de la R) — el arte de marca 2026-08 no es Sora, que sigue
// siendo la fuente del resto de la UI.
const WORDMARK_FONT = 'Poppins_600SemiBold';

type LogoProps = {
  /** ancho en px; el alto mantiene el ratio 44:48 del hexágono */
  width?: number;
  /** color de las juntas entre facetas (por defecto, el fondo de página) */
  line?: string;
};

/** El d20 de facetas — icono de la marca (la «o» del wordmark) */
export function RolderLogo({ width = 24, line }: LogoProps) {
  // id único por instancia: con id fijo, durante la transición de ruta
  // conviven dos <defs> iguales y al desmontarse el viejo el url(#...) del
  // dado que queda se rompe (hexágono invisible hasta recargar)
  const dieId = `roldr-die-${useId().replace(/:/g, '')}`;
  const height = (width * 48) / 44;
  const stroke = line ?? Rolder.page;
  const joint = Math.max(1.4, width * 0.055);
  return (
    <Svg width={width} height={height} viewBox="0 0 44 48">
      <Defs>
        <SvgGradient id={dieId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={DIE_FROM} />
          <Stop offset="1" stopColor={DIE_TO} />
        </SvgGradient>
      </Defs>
      <Polygon points="22,1 43,13 43,35 22,47 1,35 1,13" fill={`url(#${dieId})`} />
      {/* la estrella de facetas: las dos caras trianguladas del d20 */}
      <Polygon
        points="22,1 43,35 1,35"
        fill="none"
        stroke={stroke}
        strokeWidth={joint}
        strokeLinejoin="round"
      />
      <Polygon
        points="1,13 43,13 22,47"
        fill="none"
        stroke={stroke}
        strokeWidth={joint}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * El d20 con su anillo orbital — la versión «planeta» del arte de marca
 * (roldr-logo-v2). El anillo pasa por detrás del dado arriba a la derecha
 * y por delante abajo a la izquierda; las juntas de las facetas van en el
 * color del fondo, como recortadas.
 */
export function RolderDieOrbit({ width = 64, line }: LogoProps) {
  // id único por instancia — mismo motivo que en RolderLogo
  const uid = useId().replace(/:/g, '');
  const dieId = `roldr-orbit-die-${uid}`;
  const ringId = `roldr-orbit-ring-${uid}`;
  const height = (width * 64) / 72;
  const stroke = line ?? Rolder.page;
  return (
    <Svg width={width} height={height} viewBox="0 0 72 64">
      <Defs>
        <SvgGradient id={dieId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={DIE_FROM} />
          <Stop offset="1" stopColor={DIE_TO} />
        </SvgGradient>
        <SvgGradient id={ringId} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={BRAND_CRIMSON} />
          <Stop offset="1" stopColor={BRAND_PURPLE} />
        </SvgGradient>
      </Defs>
      {/* mitad trasera del anillo */}
      <G transform="translate(36,32) rotate(-16)">
        <Path
          d="M -34 0 A 34 11 0 0 1 34 0"
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.9}
        />
      </G>
      <Polygon points="36,8 55,19 55,45 36,56 17,45 17,19" fill={`url(#${dieId})`} />
      <Polygon
        points="36,8 55,45 17,45"
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Polygon
        points="17,19 55,19 36,56"
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* mitad delantera del anillo */}
      <G transform="translate(36,32) rotate(-16)">
        <Path
          d="M 34 0 A 34 11 0 0 1 -34 0"
          fill="none"
          stroke={`url(#${ringId})`}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

type WordmarkProps = {
  /** tamaño de fuente del wordmark */
  size?: number;
};

/** «Roldr» con el d20 como «o» — carmesí a la izquierda, púrpura a la derecha */
export function RolderWordmark({ size = 21 }: WordmarkProps) {
  return (
    <View style={[styles.row, { gap: size * 0.13 }]}>
      <Text style={[styles.letters, { fontSize: size, color: BRAND_CRIMSON }]}>R</Text>
      <RolderLogo width={size * 0.92} />
      <Text style={[styles.letters, { fontSize: size, color: BRAND_PURPLE }]}>ldr</Text>
    </View>
  );
}

/** Texto arbitrario con el gradiente de marca (p. ej. «¡Es un match!») */
export function RolderGradientText({ text, size = 34 }: { text: string; size?: number }) {
  // id único por instancia — mismo motivo que en RolderLogo
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letters: {
    fontFamily: WORDMARK_FONT,
    fontWeight: '600',
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
});
