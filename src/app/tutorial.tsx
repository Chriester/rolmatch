// Tutorial de bienvenida: carrusel animado que enseña el swipe, los
// matches, el chat, las sesiones y el XP. Se abre solo la primera vez
// (flag local en lib/tutorial.ts) y siempre desde Opciones.
// Animación ligada al scroll (parallax): el emoji escala y rota al entrar,
// el texto funde, los puntos se estiran.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RolderWordmark } from '@/components/brand';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { markTutorialSeen } from '@/lib/tutorial';

// Texto por partes: los objetos {b} se pintan en negrita blanca
type Part = string | { b: string };

// Dos pantallas, y ANTES del alta: esto se enseñaba después de rellenar el
// perfil entero, o sea que le explicábamos la app a quien ya había pagado
// cuatro pasos a ciegas. Lo demás (chats, sesiones, XP) se descubre solo
// cuando hace falta; aquí solo va lo que hay que saber para el primer swipe.
const SLIDES: { emoji: string; title: string; body: Part[] }[] = [
  {
    emoji: '🎲',
    title: 'Bienvenida a Roldr',
    body: [
      'Desliza para encontrar ',
      { b: 'mesa' },
      ' si juegas, o ',
      { b: 'jugadores' },
      ' si diriges. Solo verás perfiles ',
      { b: 'compatibles contigo' },
      ': horario, sistemas, idioma y estilo.',
    ],
  },
  {
    emoji: '⚔️',
    title: 'El swipe',
    body: [
      { b: 'Derecha' },
      ' = ¡CRÍTICO!, te interesa. ',
      { b: 'Izquierda' },
      ' = PIFIA, paso. Si os gustáis los dos, ',
      { b: 'match' },
      ': entras en la mesa con su chat, sus sesiones y su histórico.',
    ],
  },
];

function Slide({
  slide,
  index,
  pageWidth,
  scrollX,
}: {
  slide: (typeof SLIDES)[number];
  index: number;
  pageWidth: number;
  scrollX: SharedValue<number>;
}) {
  // posición relativa del slide respecto al viewport: -1 antes, 0 centrado, 1 después
  const emojiStyle = useAnimatedStyle(() => {
    const pos = scrollX.value / pageWidth - index;
    return {
      opacity: interpolate(pos, [-1, 0, 1], [0.2, 1, 0.2], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(pos, [-1, 0, 1], [46, 0, 46], Extrapolation.CLAMP) },
        { scale: interpolate(pos, [-1, 0, 1], [0.4, 1, 0.4], Extrapolation.CLAMP) },
        { rotate: `${interpolate(pos, [-1, 0, 1], [-24, 0, 24], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const pos = scrollX.value / pageWidth - index;
    return {
      opacity: interpolate(pos, [-0.6, 0, 0.6], [0, 1, 0], Extrapolation.CLAMP),
      // el texto viaja algo más lento que el dedo: profundidad
      transform: [
        { translateX: interpolate(pos, [-1, 0, 1], [90, 0, -90], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={[styles.slide, { width: pageWidth }]}>
      <Animated.Text style={[styles.emoji, emojiStyle]}>{slide.emoji}</Animated.Text>
      <Animated.View style={[styles.textBlock, textStyle]}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>
          {slide.body.map((part, i) =>
            typeof part === 'string' ? (
              part
            ) : (
              <Text key={i} style={styles.bold}>
                {part.b}
              </Text>
            )
          )}
        </Text>
      </Animated.View>
    </View>
  );
}

function Dot({
  index,
  pageWidth,
  scrollX,
}: {
  index: number;
  pageWidth: number;
  scrollX: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const pos = scrollX.value / pageWidth - index;
    return {
      width: interpolate(pos, [-1, 0, 1], [8, 22, 8], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(
        Math.min(Math.abs(pos), 1),
        [0, 1],
        [Rolder.violet, 'rgba(255,255,255,0.25)']
      ),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export default function TutorialScreen() {
  const { siguiente } = useLocalSearchParams<{ siguiente?: string }>();
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MaxContentWidth);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);

  useEffect(() => {
    markTutorialSeen();
  }, []);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Con ?siguiente=onboarding venimos del alta: al terminar (o al saltar) se
  // sigue hacia el perfil, no se vuelve atrás a una pantalla que no existe.
  const finish = () => {
    if (siguiente === 'onboarding') {
      router.replace('/onboarding');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const syncPage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next !== page && next >= 0 && next < SLIDES.length) setPage(next);
  };

  const goTo = (next: number) => {
    setPage(next);
    scrollRef.current?.scrollTo({ x: next * pageWidth, animated: true });
  };

  const isLast = page === SLIDES.length - 1;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { maxWidth: MaxContentWidth }]}>
        <View style={styles.header}>
          <RolderWordmark size={18} />
          <Pressable onPress={finish}>
            <Text style={styles.skip}>Saltar</Text>
          </Pressable>
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={syncPage}
          onScrollEndDrag={syncPage}
          style={styles.pager}>
          {SLIDES.map((slide, index) => (
            <Slide
              key={slide.title}
              slide={slide}
              index={index}
              pageWidth={pageWidth}
              scrollX={scrollX}
            />
          ))}
        </Animated.ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <Pressable key={slide.title} onPress={() => goTo(i)}>
              <Dot index={i} pageWidth={pageWidth} scrollX={scrollX} />
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          {isLast ? (
            <PrimaryButton
              label={siguiente === 'onboarding' ? 'Crear mi perfil ›' : 'A rodar dados'}
              onPress={finish}
            />
          ) : (
            <PrimaryButton label="Siguiente ›" onPress={() => goTo(page + 1)} />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  skip: {
    color: Rolder.textSecondary,
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    padding: 6,
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: Spacing.four,
  },
  emoji: {
    fontSize: 84,
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    color: '#fff',
    fontSize: 25,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: Rolder.textSecondary,
    fontSize: 14.5,
    lineHeight: 22,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    maxWidth: 320,
  },
  bold: {
    color: '#fff',
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.three,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
