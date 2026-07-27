// Tutorial de bienvenida: carrusel de páginas que enseña el swipe, los
// matches, el chat, las sesiones y el XP. Se abre solo la primera vez
// (flag local en lib/tutorial.ts) y siempre desde Opciones.

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RolderWordmark } from '@/components/brand';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { markTutorialSeen } from '@/lib/tutorial';

const SLIDES: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '🎲',
    title: 'Bienvenida a rolder',
    body: 'Desliza para encontrar mesa si juegas, o jugadores si diriges. El feed solo te enseña gente y mesas compatibles contigo: horario, sistemas, idioma y estilo de juego.',
  },
  {
    emoji: '⚔️',
    title: 'El swipe',
    body: 'Derecha = ¡CRÍTICO! (te interesa). Izquierda = PIFIA (paso). Toca la tarjeta para ver los personajes del jugador, y el botón ⓘ para el detalle completo.',
  },
  {
    emoji: '🤝',
    title: 'Matches',
    body: 'Si os gustáis los dos, hay match: entras en la mesa y el bot os abre un canal privado en el Discord de la comunidad. Todo sigue desde ahí… o desde el chat de la app.',
  },
  {
    emoji: '💬',
    title: 'Chats de mesa',
    body: 'Cada mesa tiene su chat con emojis, GIFs y stickers. El botón ⓘ del chat abre la info de la mesa: horario, próxima sesión y miembros (toca uno para ver su perfil).',
  },
  {
    emoji: '📅',
    title: 'Sesiones e histórico',
    body: 'El GM programa sesiones en el perfil de la mesa. Después de jugar, confirmadla: con 3 confirmaciones todos ganáis +150 XP. Y subid vuestros momentos al histórico.',
  },
  {
    emoji: '🏆',
    title: 'Sube de nivel',
    body: 'Jugar da experiencia: completa tu perfil, únete a mesas, valora a tus compañeros. Tu título rolero — de «Dado prestado» a «Mito viviente» — aparece en tu tarjeta.',
  },
];

export default function TutorialScreen() {
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, MaxContentWidth);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    markTutorialSeen();
  }, []);

  const finish = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next !== page && next >= 0 && next < SLIDES.length) setPage(next);
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

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          onScrollEndDrag={handleScroll}
          style={styles.pager}>
          {SLIDES.map((slide) => (
            <View key={slide.title} style={[styles.slide, { width: pageWidth }]}>
              <Text style={styles.emoji}>{slide.emoji}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <Pressable
              key={slide.title}
              onPress={() => {
                setPage(i);
                scrollRef.current?.scrollTo({ x: i * pageWidth, animated: true });
              }}>
              <View style={[styles.dot, i === page && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          {isLast ? (
            <PrimaryButton label="¡A rodar dados! 🎲" onPress={finish} />
          ) : (
            <PrimaryButton
              label="Siguiente ›"
              onPress={() => {
                const next = page + 1;
                setPage(next);
                scrollRef.current?.scrollTo({ x: next * pageWidth, animated: true });
              }}
            />
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
    paddingHorizontal: 32,
    gap: Spacing.three,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    maxWidth: 340,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: Rolder.violet,
    width: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
