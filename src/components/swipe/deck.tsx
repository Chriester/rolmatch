/* eslint-disable react-hooks/immutability -- las mutaciones de shared values
   dentro de worklets de gesto son la API oficial de Reanimated; la regla del
   React Compiler no las reconoce. */
// Física del deck de swipe (ver docs/diseno-swipe.md).
// La tarjeta superior se monta con `key` por item: cada tarjeta estrena sus
// shared values y no hay flashes al avanzar. La escala de la tarjeta de
// detrás se anima con un shared value de progreso a nivel de deck.

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export type SwipeChoice = 'like' | 'pass';
export type SwipeDeckHandle = { swipe: (choice: SwipeChoice) => void };

// Parámetros del feel — ajustar aquí, no en las pantallas
const MAX_ROTATION_DEG = 12;
const THRESHOLD_FRACTION = 0.35;
const FLING_VELOCITY = 900;
// El swipe es manipulación directa, no animación decorativa: se anima siempre,
// aunque el sistema tenga "movimiento reducido" activado.
const EXIT_TIMING = { duration: 260, reduceMotion: ReduceMotion.Never };
const RETURN_SPRING = { damping: 16, stiffness: 190, reduceMotion: ReduceMotion.Never };
const NEXT_CARD_SCALE = 0.95;
const SWIPE_UP_DISTANCE = 110;

type TopCardHandle = { fly: (dir: 1 | -1) => void };

type TopCardProps = {
  width: number;
  enabled: boolean;
  progress: SharedValue<number>;
  likeLabel: string;
  passLabel: string;
  onSwiped: (choice: SwipeChoice) => void;
  onSwipeUp?: () => void;
  children: ReactNode;
};

const TopCard = forwardRef<TopCardHandle, TopCardProps>(function TopCard(
  { width, enabled, progress, likeLabel, passLabel, onSwiped, onSwipeUp, children },
  ref
) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const threshold = width * THRESHOLD_FRACTION;
  // La tarjeta debe salir de la PANTALLA, no solo del mazo (en escritorio la
  // ventana es más ancha que el deck y desaparecía a medio vuelo).
  const exitDistance = Math.max(width * 1.6, Dimensions.get('window').width * 1.1);

  const finish = (dir: number) => onSwiped(dir > 0 ? 'like' : 'pass');

  const fly = (dir: 1 | -1, verticalVelocity = 0) => {
    tx.value = withTiming(dir * exitDistance, EXIT_TIMING, (done) => {
      if (done) runOnJS(finish)(dir);
    });
    ty.value = withTiming(ty.value + verticalVelocity * 0.12, EXIT_TIMING);
  };

  useImperativeHandle(ref, () => ({ fly }));

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((event) => {
      tx.value = event.translationX;
      ty.value = event.translationY;
      progress.value = Math.min(Math.abs(event.translationX) / threshold, 1);
    })
    .onEnd((event) => {
      const decided =
        Math.abs(tx.value) > threshold || Math.abs(event.velocityX) > FLING_VELOCITY;
      const swipedUp =
        onSwipeUp !== undefined &&
        (ty.value < -SWIPE_UP_DISTANCE || event.velocityY < -FLING_VELOCITY) &&
        Math.abs(tx.value) < threshold * 0.6;
      if (decided) {
        const dir = (tx.value !== 0 ? Math.sign(tx.value) : Math.sign(event.velocityX)) as 1 | -1;
        runOnJS(fly)(dir, event.velocityY);
      } else {
        if (swipedUp && onSwipeUp) runOnJS(onSwipeUp)();
        tx.value = withSpring(0, RETURN_SPRING);
        ty.value = withSpring(0, RETURN_SPRING);
        progress.value = withSpring(0, RETURN_SPRING);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      {
        rotate: `${interpolate(
          tx.value,
          [-width, 0, width],
          [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG]
        )}deg`,
      },
    ],
  }));

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [threshold * 0.15, threshold], [0, 1], Extrapolation.CLAMP),
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-threshold, -threshold * 0.15], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, cardStyle]}>
        {children}
        <Animated.View style={[styles.stamp, styles.stampLike, likeStampStyle]}>
          <Text style={[styles.stampText, styles.stampTextLike]}>{likeLabel}</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampPass, passStampStyle]}>
          <Text style={[styles.stampText, styles.stampTextPass]}>{passLabel}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

type SwipeDeckProps<T> = {
  items: T[];
  index: number;
  keyFor: (item: T) => string;
  renderCard: (item: T, isTop: boolean) => ReactNode;
  onSwiped: (item: T, choice: SwipeChoice) => void;
  /** arrastrar hacia arriba (patrón Tinder): abre los detalles */
  onSwipeUp?: () => void;
  enabled?: boolean;
  likeLabel?: string;
  passLabel?: string;
  /** ref imperativa para que los botones disparen la misma animación */
  deckRef?: MutableRefObject<SwipeDeckHandle | null>;
};

export function SwipeDeck<T>({
  items,
  index,
  keyFor,
  renderCard,
  onSwiped,
  onSwipeUp,
  enabled = true,
  likeLabel = 'ME INTERESA',
  passLabel = 'PASO',
  deckRef,
}: SwipeDeckProps<T>) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const topRef = useRef<TopCardHandle>(null);

  const current = items[index];
  const next = items[index + 1];

  useEffect(() => {
    if (!deckRef) return;
    deckRef.current = {
      swipe: (choice) => topRef.current?.fly(choice === 'like' ? 1 : -1),
    };
    return () => {
      deckRef.current = null;
    };
  });

  const handleSwiped = (choice: SwipeChoice) => {
    progress.value = 0;
    if (current !== undefined) onSwiped(current, choice);
  };

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [NEXT_CARD_SCALE, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View
      style={styles.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {next !== undefined && (
        <Animated.View
          key={`next-${keyFor(next)}`}
          style={[StyleSheet.absoluteFill, nextCardStyle]}>
          {renderCard(next, false)}
        </Animated.View>
      )}
      {current !== undefined && width > 0 && (
        <TopCard
          key={keyFor(current)}
          ref={topRef}
          width={width}
          enabled={enabled}
          progress={progress}
          likeLabel={likeLabel}
          passLabel={passLabel}
          onSwiped={handleSwiped}
          onSwipeUp={onSwipeUp}>
          {renderCard(current, true)}
        </TopCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  stamp: {
    position: 'absolute',
    top: 28,
    borderWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  stampLike: {
    left: 20,
    borderColor: '#3BD16F',
    transform: [{ rotate: '-14deg' }],
  },
  stampPass: {
    right: 20,
    borderColor: '#F3485B',
    transform: [{ rotate: '14deg' }],
  },
  stampText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
  },
  stampTextLike: {
    color: '#3BD16F',
  },
  stampTextPass: {
    color: '#F3485B',
  },
});
