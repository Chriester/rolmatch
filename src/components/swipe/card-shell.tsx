// Tarjeta a sangre completa: la foto es la protagonista; la información va
// superpuesta abajo sobre un degradado oscuro. Sin foto: degradado de marca
// con emoji grande — nunca un hueco gris (handoff rolder §1).

import { Image } from 'expo-image';
import { useEffect } from 'react';
import Animated, {
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';

type CardShellProps = {
  imageUrl: string | null;
  fallbackEmoji: string;
  /** degradado del fallback sin foto (por defecto índigo→violeta de mesa) */
  fallbackColors?: readonly [string, string];
  /** contenido superpuesto arriba a la derecha (p. ej. badge de score) */
  topRight?: ReactNode;
  /** banda superior opcional (p. ej. «💘 Le gustáis») */
  banner?: ReactNode;
  /**
   * Resumen para lector de pantalla: la tarjeta pasa a ser UN elemento
   * legible («Mesa Eladria, D&D 5e, sábado por la mañana…»). Sin él, el
   * deck era invisible para TalkBack/VoiceOver (los botones ✕/♥ hablan,
   * pero nadie decía QUÉ se estaba aceptando). Ojo: agrupa a sus hijos,
   * así que no ponerlo en caras con controles dentro (like de personaje).
   */
  accessibilityLabel?: string;
  children: ReactNode;
};

export function CardShell({
  imageUrl,
  fallbackEmoji,
  fallbackColors = ['#4A55E2', '#8B6CFF'],
  topRight,
  banner,
  accessibilityLabel,
  children,
}: CardShellProps) {
  return (
    <View
      style={styles.card}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={fallbackColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={styles.fallbackEmoji}>{fallbackEmoji}</Text>
        </LinearGradient>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(10,10,18,0.55)', 'rgba(10,10,18,0.94)']}
        style={styles.bottomGradient}
      />

      {banner && <View style={styles.banner}>{banner}</View>}
      {topRight && <View style={styles.topRight}>{topRight}</View>}

      <View style={styles.info}>{children}</View>
    </View>
  );
}

/** Chevron pulsante: «desliza hacia arriba para más info» (va sobre la caja) */
export function CardHint() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, reduceMotion: ReduceMotion.Never }),
        withTiming(0, { duration: 900, reduceMotion: ReduceMotion.Never })
      ),
      -1
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.55 * pulse.value,
    transform: [{ translateY: interpolate(pulse.value, [0, 1], [2, -3]) }],
  }));
  return (
    <View style={hintStyles.wrap} pointerEvents="none">
      <Animated.Text style={[hintStyles.glyph, style]}>︿</Animated.Text>
    </View>
  );
}

/** Caja translúcida de descripción (patrón Tinder, bajo el título) */
export function CardBlurb({ children }: { children: ReactNode }) {
  return <View style={blurbStyles.box}>{children}</View>;
}

/** Chip translúcido de la tarjeta (fila bajo el título) */
export function CardChip({ label, variant = 'default' }: { label: string; variant?: 'default' | 'green' }) {
  return (
    <View style={[chipStyles.chip, variant === 'green' && chipStyles.chipGreen]}>
      <Text
        style={[chipStyles.label, variant === 'green' && chipStyles.labelGreen]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Fila de chips de la tarjeta */
export function CardChipRow({ children }: { children: ReactNode }) {
  return <View style={chipStyles.row}>{children}</View>;
}

// Tipografía de tarjeta: siempre blanca, va sobre foto/degradado oscuro
export const cardText = StyleSheet.create({
  title: {
    color: '#fff',
    fontSize: 26,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  line: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  blurb: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: RolderFonts.regular,
  },
  compat: {
    color: Rolder.likeChipText,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  soft: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontFamily: RolderFonts.regular,
  },
});

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  chipGreen: {
    backgroundColor: Rolder.likeChipBg,
    borderColor: Rolder.likeChipBorder,
  },
  label: {
    color: '#fff',
    fontSize: 11.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  labelGreen: {
    color: Rolder.likeChipText,
  },
});

const hintStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: -2,
  },
  glyph: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 19,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
});

const blurbStyles = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(12,12,20,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
  },
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Rolder.surface,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 110,
    opacity: 0.95,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  banner: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
  },
  topRight: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  info: {
    position: 'absolute',
    left: 20,
    right: 20,
    // hueco para la botonera que monta sobre el borde inferior (Tinder)
    bottom: 56,
    gap: 8,
  },
});
