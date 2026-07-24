// Marca rolder: logo hexágono d20 con gradiente y wordmark con gradiente.
// Todo SVG (react-native-svg): idéntico en web, iOS y Android, sin assets.

import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Polygon,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Rolder } from '@/constants/theme';

type LogoProps = {
  /** ancho en px; el alto mantiene el ratio 44:48 del hexágono */
  width?: number;
};

/** Hexágono d20 con «20» centrado — el icono de la app */
export function RolderLogo({ width = 24 }: LogoProps) {
  const height = (width * 48) / 44;
  return (
    <Svg width={width} height={height} viewBox="0 0 44 48">
      <Defs>
        <SvgGradient id="rolder-hex" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={Rolder.coral} />
          <Stop offset="1" stopColor={Rolder.violet} />
        </SvgGradient>
      </Defs>
      <Polygon points="22,0 44,12 44,36 22,48 0,36 0,12" fill="url(#rolder-hex)" />
      <SvgText
        x="22"
        y="24"
        fill="#FFFFFF"
        fontFamily="Sora_800ExtraBold"
        fontSize={width >= 40 ? 17 : 15}
        fontWeight="800"
        textAnchor="middle"
        alignmentBaseline="central">
        20
      </SvgText>
    </Svg>
  );
}

type WordmarkProps = {
  /** tamaño de fuente del wordmark */
  size?: number;
};

/** «rolder» en Sora 800 con gradiente coral→violeta */
export function RolderWordmark({ size = 21 }: WordmarkProps) {
  // ancho estimado del texto: ~3.55 caracteres de media a 0.62em
  const width = size * 3.6;
  const height = size * 1.4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgGradient id="rolder-word" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={Rolder.coral} />
          <Stop offset="1" stopColor={Rolder.violet} />
        </SvgGradient>
      </Defs>
      <SvgText
        x="0"
        y={size * 1.05}
        fill="url(#rolder-word)"
        fontFamily="Sora_800ExtraBold"
        fontSize={size}
        fontWeight="800"
        letterSpacing={-size * 0.02}>
        rolder
      </SvgText>
    </Svg>
  );
}

/** Texto arbitrario con el gradiente de marca (p. ej. «¡Es un match!») */
export function RolderGradientText({ text, size = 34 }: { text: string; size?: number }) {
  const width = Math.max(text.length * size * 0.62, size * 4);
  const height = size * 1.4;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgGradient id="rolder-gtext" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={Rolder.coral} />
          <Stop offset="1" stopColor={Rolder.violet} />
        </SvgGradient>
      </Defs>
      <SvgText
        x={width / 2}
        y={size * 1.05}
        fill="url(#rolder-gtext)"
        fontFamily="Sora_800ExtraBold"
        fontSize={size}
        fontWeight="800"
        textAnchor="middle">
        {text}
      </SvgText>
    </Svg>
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
    <View style={styles.row}>
      <RolderLogo width={logoWidth} />
      <RolderWordmark size={wordmarkSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
