// Botones circulares de acción — disparan la misma animación que el gesto
// vía la ref del deck. Orden y estilos del handoff rolder §1:
// ↩ rewind 46 · ✕ pass 64 · ⚔ like 64 (gradiente verde) · ⓘ info 46.

import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder } from '@/constants/theme';

type ActionBarProps = {
  onPass: () => void;
  onLike: () => void;
  onInfo?: () => void;
  /** rewind premium (↩); se muestra siempre y la pantalla decide el gate */
  onRewind?: () => void;
  disabled?: boolean;
};

export function ActionBar({ onPass, onLike, onInfo, onRewind, disabled }: ActionBarProps) {
  return (
    <View style={styles.row}>
      {onRewind && (
        <Pressable
          style={({ pressed }) => [styles.button, styles.small, pressed && styles.pressed]}
          onPress={onRewind}
          accessibilityLabel="Deshacer último swipe">
          <Text style={styles.rewindGlyph}>↩</Text>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.pass,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onPass}
        disabled={disabled}
        accessibilityLabel="Pasar">
        <Text style={styles.passGlyph}>✕</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [disabled && styles.disabled, pressed && styles.pressed]}
        onPress={onLike}
        disabled={disabled}
        accessibilityLabel="Me interesa">
        <LinearGradient
          colors={Rolder.likeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, styles.like]}>
          <Text style={styles.likeGlyph}>⚔</Text>
        </LinearGradient>
      </Pressable>

      {onInfo && (
        <Pressable
          style={({ pressed }) => [styles.button, styles.small, pressed && styles.pressed]}
          onPress={onInfo}
          accessibilityLabel="Ver detalles">
          <Text style={styles.infoGlyph}>i</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingBottom: 10,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Rolder.input,
    boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
  },
  small: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  pass: {
    borderWidth: 2,
    borderColor: Rolder.pass,
  },
  like: {
    boxShadow: '0 6px 18px rgba(59,209,111,0.35)',
  },
  rewindGlyph: {
    color: Rolder.gold,
    fontSize: 22,
  },
  passGlyph: {
    color: Rolder.pass,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  likeGlyph: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 34,
  },
  infoGlyph: {
    color: Rolder.violet,
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '800',
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
