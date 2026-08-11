// Silueta de tarjeta mientras carga el feed: la forma de lo que viene en
// vez de una rueda en el vacío — la carga percibida es más corta y no hay
// salto de layout al llegar la primera tarjeta real.
//
// El pulso es decorativo, así que AQUÍ sí se respeta el ajuste de
// movimiento reducido del sistema (a diferencia de la física del deck,
// que es manipulación directa y usa ReduceMotion.Never).

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Rolder } from '@/constants/theme';

export function CardSkeleton() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.55, 1]),
  }));

  return (
    <Animated.View style={[styles.card, pulseStyle]} accessibilityLabel="Cargando el feed">
      {/* donde irá el título y los chips, alineado abajo como la tarjeta real */}
      <View style={styles.bottom}>
        <View style={styles.title} />
        <View style={styles.chipRow}>
          <View style={[styles.chip, { width: 110 }]} />
          <View style={[styles.chip, { width: 74 }]} />
          <View style={[styles.chip, { width: 86 }]} />
        </View>
        <View style={styles.line} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    justifyContent: 'flex-end',
  },
  bottom: {
    padding: 18,
    gap: 12,
  },
  title: {
    height: 26,
    width: '62%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  line: {
    height: 13,
    width: '84%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
});
