// Transición de página universal: al cambiar de ruta, el contenido nuevo
// aparece con un fade corto en vez de aparecer de golpe. Envuelve SOLO la
// zona del Stack (la barra inferior vive fuera y no parpadea). En nativo
// convive con la transición del stack; en web es la única que hay.

import { usePathname } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MotionDur, MotionEase } from '@/constants/motion';

export function RouteFade({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const pathname = usePathname();
  const progress = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    // el arranque no se funde: el splash ya cubre ese momento
    if (first.current) {
      first.current = false;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: MotionDur.md,
      easing: Easing.bezier(...MotionEase.out),
      // que corra aunque el sistema tenga los efectos apagados (Windows)
      reduceMotion: ReduceMotion.Never,
    });
  }, [pathname, progress]);

  const anim = useAnimatedStyle(() => ({ opacity: progress.value }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
