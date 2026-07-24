// Botones circulares de acción (✕ / ♥) — disparan la misma animación que el
// gesto vía la ref del deck. Con fondo opaco: la tarjeta nunca se ve debajo.

import { Pressable, StyleSheet, Text } from 'react-native';

import { ThemedView } from '@/components/themed-view';

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
    <ThemedView style={styles.row}>
      {onRewind && (
        <Pressable
          style={({ pressed }) => [styles.button, styles.rewind, pressed && styles.pressed]}
          onPress={onRewind}
          accessibilityLabel="Deshacer último swipe">
          <Text style={[styles.glyph, styles.rewindGlyph]}>↩</Text>
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
        <Text style={[styles.glyph, styles.passGlyph]}>✕</Text>
      </Pressable>

      {onInfo && (
        <Pressable
          style={({ pressed }) => [styles.button, styles.info, pressed && styles.pressed]}
          onPress={onInfo}
          accessibilityLabel="Ver detalles">
          <Text style={[styles.glyph, styles.infoGlyph]}>i</Text>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.like,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onLike}
        disabled={disabled}
        accessibilityLabel="Me interesa">
        <Text style={[styles.glyph, styles.likeGlyph]}>♥</Text>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingVertical: 14,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pass: {
    borderColor: '#F3485B',
  },
  like: {
    borderColor: '#3BD16F',
  },
  info: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  rewind: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderColor: '#F5A623',
  },
  rewindGlyph: {
    color: '#F5A623',
    fontSize: 22,
  },
  glyph: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  passGlyph: {
    color: '#F3485B',
  },
  likeGlyph: {
    color: '#3BD16F',
  },
  infoGlyph: {
    color: 'rgba(255,255,255,0.8)',
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
