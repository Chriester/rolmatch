// Panel de detalles: se desliza sobre la zona del deck con la información
// secundaria (descripción, estilo, vitrina, moderación). La tarjeta en sí
// nunca scrollea.

import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';

type DetailsSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function DetailsSheet({ visible, title, onClose, children }: DetailsSheetProps) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.Never)}
      exiting={FadeOutDown.duration(180).reduceMotion(ReduceMotion.Never)}
      style={styles.sheet}>
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
    top: '30%',
    backgroundColor: 'rgba(18,19,24,0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
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
