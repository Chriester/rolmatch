// Tap sobre la tarjeta → cicla entre caras (jugador → personaje 1 → … → jugador)
// con un medio giro por cara y puntitos de posición arriba, como el carrusel
// de fotos de Tinder. El tap se cancela si hay arrastre (Gesture.Tap).

import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const HALF_FLIP = { duration: 150, reduceMotion: ReduceMotion.Never };

type CardCycleProps = {
  faces: ReactNode[];
};

export function CardCycle({ faces }: CardCycleProps) {
  const [face, setFace] = useState(0);
  const rotation = useSharedValue(0);

  const advance = () => {
    setFace((f) => (f + 1) % faces.length);
    rotation.value = -90;
    rotation.value = withTiming(0, HALF_FLIP);
  };

  const cycle = () => {
    if (faces.length < 2) return;
    rotation.value = withTiming(90, HALF_FLIP, (done) => {
      if (done) runOnJS(advance)();
    });
  };

  const tap = Gesture.Tap()
    .maxDistance(12)
    .onEnd((_event, success) => {
      if (success) runOnJS(cycle)();
    });

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${rotation.value}deg` }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <View style={styles.fill}>
        <Animated.View style={[styles.fill, faceStyle]}>{faces[face]}</Animated.View>
        <View style={styles.dots} pointerEvents="none">
          {faces.map((_, i) => (
            <View key={i} style={[styles.dot, i === face && styles.dotActive]} />
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  // Indicador de caras: barras estilo stories a ancho completo, en partes
  // iguales (con una sola cara queda una única barra, como pidió Chris)
  dots: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#fff',
  },
});
