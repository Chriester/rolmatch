// Overlay de actualización OTA: mientras la app descarga y aplica una
// versión nueva al arrancar, que se vea que está trabajando — logo con
// latido, spinner y un guiño rolero.

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RolderLogo } from '@/components/brand';
import { Rolder, RolderFonts } from '@/constants/theme';

export function UpdateOverlay() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, reduceMotion: ReduceMotion.Never }),
        withTiming(0, { duration: 700, reduceMotion: ReduceMotion.Never })
      ),
      -1
    );
  }, [pulse]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.12 }],
    opacity: 0.85 + pulse.value * 0.15,
  }));

  return (
    <View style={styles.backdrop}>
      <Animated.View style={logoStyle}>
        <RolderLogo width={72} />
      </Animated.View>
      <Text style={styles.title}>Actualizando rolder…</Text>
      <Text style={styles.subtitle}>Un momento, estamos afilando los dados 🎲</Text>
      <ActivityIndicator color={Rolder.violetSoft} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Rolder.page,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 100,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  subtitle: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
  },
});
