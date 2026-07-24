// Tarjeta a sangre completa: la foto es la protagonista; la información va
// superpuesta abajo sobre un degradado oscuro. Sin foto: degradado de marca
// con emoji grande — nunca un hueco gris (docs/diseno-swipe.md).

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type CardShellProps = {
  imageUrl: string | null;
  fallbackEmoji: string;
  /** contenido superpuesto arriba a la derecha (p. ej. badge de score) */
  topRight?: ReactNode;
  /** banda superior opcional (p. ej. «💘 Le gustáis») */
  banner?: ReactNode;
  children: ReactNode;
};

export function CardShell({ imageUrl, fallbackEmoji, topRight, banner, children }: CardShellProps) {
  return (
    <View style={styles.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={['#5865F2', '#2A2D43']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={styles.fallbackEmoji}>{fallbackEmoji}</Text>
        </LinearGradient>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        style={styles.bottomGradient}
      />

      {banner && <View style={styles.banner}>{banner}</View>}
      {topRight && <View style={styles.topRight}>{topRight}</View>}

      <View style={styles.info}>{children}</View>
    </View>
  );
}

// Tipografía de tarjeta: siempre blanca, va sobre foto/degradado oscuro
export const cardText = StyleSheet.create({
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  line: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '500',
  },
  soft: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1c1d22',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 96,
    opacity: 0.9,
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
    top: 0,
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
    bottom: 20,
    gap: 6,
  },
});
