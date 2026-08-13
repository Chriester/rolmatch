// CoverStrip (rediseño de mesas, entregable §6): franja de portada de 58 px
// con la foto de la mesa (o un gradiente estable derivado del nombre — cada
// mesa sin foto tiene SU color, no el gris de siempre), el nombre encima y
// un hueco a la derecha para el StatusPill. Da identidad a cada mesa en
// listas; pensada como cabecera de tarjeta (la tarjeta pone el radio y el
// overflow hidden).

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RolderFonts } from '@/constants/theme';

// Parejas dentro de la banda de marca Roldr (carmesí→ciruela→violeta→lila):
// estables y distinguibles entre sí sin salirse del sistema.
const GRADIENTS: readonly (readonly [string, string])[] = [
  ['#5D4A93', '#C77DFF'],
  ['#8A2B76', '#5D4A93'],
  ['#B01B5E', '#8A2B76'],
  ['#3A2360', '#8A2B76'],
  ['#8A2B76', '#C77DFF'],
];

/** Gradiente determinista por nombre: la misma mesa siempre luce igual. */
function gradientFor(name: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

type CoverStripProps = {
  name: string;
  imageUrl: string | null;
  /** normalmente un StatusPill; va sobre la portada, a la derecha */
  right?: ReactNode;
  emoji?: string;
};

export function CoverStrip({ name, imageUrl, right, emoji = '🎲' }: CoverStripProps) {
  return (
    <View style={styles.strip}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={gradientFor(name)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* velo para que el nombre lea sobre cualquier foto */}
      <View style={styles.scrim} />
      <View style={styles.row}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: 58,
    justifyContent: 'center',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,18,0.38)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  emoji: {
    fontSize: 18,
  },
  name: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '800',
  },
});
