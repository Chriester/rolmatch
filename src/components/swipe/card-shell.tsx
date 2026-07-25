// Tarjeta a sangre completa: la foto es la protagonista; la información va
// superpuesta abajo sobre un degradado oscuro. Sin foto: degradado de marca
// con emoji grande — nunca un hueco gris (handoff rolder §1).

import { Image } from 'expo-image';
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
  children: ReactNode;
};

export function CardShell({
  imageUrl,
  fallbackEmoji,
  fallbackColors = ['#4A55E2', '#8B6CFF'],
  topRight,
  banner,
  children,
}: CardShellProps) {
  return (
    <View style={styles.card}>
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
    bottom: 18,
    gap: 8,
  },
});
