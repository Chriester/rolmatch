// «🎲 ¡Es un match!» — overlay a pantalla completa con las dos fotos.
// Sustituye al alert: el match es un momento, no una notificación.

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, ZoomIn } from 'react-native-reanimated';

type Side = { imageUrl: string | null; fallbackEmoji: string };

type MatchOverlayProps = {
  visible: boolean;
  left: Side;
  right: Side;
  subtitle: string;
  onClose: () => void;
};

function Portrait({ side, offset }: { side: Side; offset: number }) {
  return (
    <View style={[styles.portrait, { transform: [{ translateX: offset }] }]}>
      {side.imageUrl ? (
        <Image source={{ uri: side.imageUrl }} style={styles.portraitImage} contentFit="cover" />
      ) : (
        <Text style={styles.portraitEmoji}>{side.fallbackEmoji}</Text>
      )}
    </View>
  );
}

export function MatchOverlay({ visible, left, right, subtitle, onClose }: MatchOverlayProps) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(250).reduceMotion(ReduceMotion.Never)}
      style={styles.backdrop}>
      <Animated.View
        entering={ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.Never)}
        style={styles.content}>
        <Text style={styles.title}>🎲 ¡Es un match!</Text>
        <View style={styles.portraits}>
          <Portrait side={left} offset={14} />
          <Portrait side={right} offset={-14} />
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            onClose();
            router.push('/matches');
          }}>
          <Text style={styles.primaryLabel}>Ver mis matches</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onClose}>
          <Text style={styles.secondaryLabel}>Seguir buscando</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,16,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  content: {
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 420,
  },
  title: {
    color: '#3BD16F',
    fontSize: 40,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  portraits: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  portrait: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#2A2D43',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitEmoji: {
    fontSize: 52,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#5865F2',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 8,
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  secondaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
});
