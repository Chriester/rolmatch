// Banner flotante de «hay versión nueva» (solo web). No recargamos en
// automático para no tirar un mensaje a medio escribir: un toque y listo.

import { Pressable, StyleSheet, Text } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';

export function UpdateBanner() {
  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      accessibilityLabel="Actualizar a la versión nueva"
      onPress={() => {
        if (typeof window !== 'undefined') window.location.reload();
      }}>
      <Text style={styles.label}>🎲 Hay una versión nueva — toca para actualizar</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: Rolder.violet,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 100,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
});
