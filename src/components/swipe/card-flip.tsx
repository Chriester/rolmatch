// Tap sobre la tarjeta → se da la vuelta (patrón Tinder adaptado): el dorso
// muestra la vitrina pública del jugador.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const FLIP_TIMING = { duration: 380, reduceMotion: ReduceMotion.Never };

type CardFlipProps = {
  front: ReactNode;
  back: ReactNode;
};

export function CardFlip({ front, back }: CardFlipProps) {
  const rotation = useSharedValue(0);

  const flip = () => {
    rotation.value = withTiming(rotation.value > 90 ? 0 : 180, FLIP_TIMING);
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value}deg` }],
    zIndex: rotation.value > 90 ? 0 : 1,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value - 180}deg` }],
    zIndex: rotation.value > 90 ? 1 : 0,
  }));

  return (
    <Pressable style={styles.fill} onPress={flip} accessibilityLabel="Girar tarjeta">
      <Animated.View style={[styles.face, frontStyle]}>{front}</Animated.View>
      <Animated.View style={[styles.face, backStyle]}>{back}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
});
