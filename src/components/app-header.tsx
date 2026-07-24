// Cabecera persistente de la app: la marca (🎲 RolMatch) siempre visible y
// clicable — te devuelve al feed desde cualquier pantalla.

import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type AppHeaderProps = {
  /** flecha de volver opcional (pantallas con padre directo) */
  onBack?: () => void;
  /** hueco derecho (p. ej. avatar del menú en la home) */
  right?: ReactNode;
};

export function AppHeader({ onBack, right }: AppHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.back} accessibilityLabel="Volver">
            <ThemedText type="link">←</ThemedText>
          </Pressable>
        )}
        <Pressable onPress={() => router.navigate('/')} accessibilityLabel="Ir al feed">
          <ThemedText type="subtitle">🎲 RolMatch</ThemedText>
        </Pressable>
      </View>
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  back: {
    width: 28,
  },
  spacer: {
    width: 44,
  },
});
