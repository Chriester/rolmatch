// Aparición suave reutilizable: fade + deslizamiento corto hacia arriba.
// Para paneles de pestañas y desplegables — que abrir algo se sienta como
// un movimiento y no como un corte. La física del feed NO usa esto (vive
// en swipe/deck.tsx con sus propios parámetros).

import { type ReactNode, useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type RevealProps = {
  children: ReactNode;
  /** al cambiar (p. ej. la pestaña activa), la aparición se repite */
  switchKey?: string | number | null;
  /** desplazamiento inicial en px */
  distance?: number;
  style?: StyleProp<ViewStyle>;
};

export function Reveal({ children, switchKey, distance = 10, style }: RevealProps) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    // ReduceMotion.Never: muchos Windows llevan los efectos del sistema
    // apagados por rendimiento y Reanimated se saltaría el timing — estas
    // apariciones son cortas y sutiles, se fuerzan siempre
    progress.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.Never,
    });
  }, [switchKey, progress]);
  const anim = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * distance }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
