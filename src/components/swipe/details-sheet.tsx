/* eslint-disable react-hooks/immutability -- mutaciones de shared values,
   API oficial de Reanimated */
// Panel de detalles ligado al gesto: mientras arrastras la tarjeta hacia
// arriba, el panel asoma desde abajo en sincronía (la tarjeta se "alarga");
// al soltar pasado el umbral se abre del todo con muelle.

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

const OPEN_SPRING = { damping: 19, stiffness: 200, reduceMotion: ReduceMotion.Never };

type DetailsSheetProps = {
  open: boolean;
  /** progreso 0..1 del arrastre vertical del deck (previsualización) */
  pullProgress?: SharedValue<number>;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function DetailsSheet({ open, pullProgress, title, onClose, children }: DetailsSheetProps) {
  const [height, setHeight] = useState(0);
  const openSv = useSharedValue(0);

  useEffect(() => {
    openSv.value = withSpring(open ? 1 : 0, OPEN_SPRING);
    if (!open && pullProgress) pullProgress.value = withSpring(0, OPEN_SPRING);
  }, [open, openSv, pullProgress]);

  const sheetStyle = useAnimatedStyle(() => {
    const progress = Math.max(openSv.value, pullProgress?.value ?? 0);
    return {
      transform: [
        {
          translateY: interpolate(progress, [0, 1], [height, 0], Extrapolation.CLAMP),
        },
      ],
      opacity: height === 0 ? 0 : 1,
      pointerEvents: open ? ('auto' as const) : ('none' as const),
    };
  }, [open, height]);

  return (
    <Animated.View
      style={[styles.sheet, sheetStyle]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={onClose} accessibilityLabel="Cerrar detalles" style={styles.close}>
          <Text style={styles.closeGlyph}>▾</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

export const sheetText = StyleSheet.create({
  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
  },
  body: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 21,
  },
  link: {
    color: '#F3485B',
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '28%',
    backgroundColor: 'rgba(18,19,24,0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    flexShrink: 1,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 22,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 4,
  },
});
