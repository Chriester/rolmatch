// «¡Es un match!» — overlay a pantalla completa con las dos fotos.
// Sustituye al alert: el match es un momento, no una notificación.
// Estilo del handoff rolder §4: logo con pop, título en gradiente de marca,
// círculos solapados y CTA verde.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { RolderGradientText, RolderLogo } from '@/components/brand';
import { Rolder, RolderFonts } from '@/constants/theme';
import { hapticMatch } from '@/lib/haptics';

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
  useEffect(() => {
    if (visible) hapticMatch();
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(250).reduceMotion(ReduceMotion.Never)}
      style={styles.backdrop}>
      <Animated.View
        entering={ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.Never)}
        style={styles.content}>
        <RolderLogo width={56} />
        <RolderGradientText text="¡Es un match!" size={34} />
        <View style={styles.portraits}>
          <Portrait side={left} offset={9} />
          <Portrait side={right} offset={-9} />
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <Pressable
          style={({ pressed }) => [styles.primaryPressable, pressed && styles.pressed]}
          onPress={() => {
            onClose();
            router.push('/matches');
          }}>
          <LinearGradient
            colors={Rolder.likeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButton}>
            <Text style={styles.primaryLabel}>💬 Ver mis matches</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={onClose}>
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
    backgroundColor: 'rgba(11,11,18,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  content: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 420,
  },
  portraits: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  portrait: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Rolder.page,
    overflow: 'hidden',
    backgroundColor: '#4A45A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitEmoji: {
    fontSize: 46,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryPressable: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    boxShadow: '0 6px 18px rgba(59,209,111,0.35)',
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 16,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  secondaryLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
