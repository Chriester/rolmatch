/* eslint-disable react-hooks/immutability -- las mutaciones de shared values
   dentro de worklets de gesto son la API oficial de Reanimated; la regla del
   React Compiler no las reconoce. */
// Física del deck de swipe (ver docs/diseno-swipe.md).
//
// Modelo vertical: cada tarjeta es una TIRA de dos alturas (tarjeta arriba,
// descripción debajo) que desliza dentro de un marco con clipping. Arrastrar
// hacia arriba saca la tarjeta por el borde superior y deja la descripción en
// su lugar; hacia abajo la devuelve. El swipe horizontal decide like/pass y
// se desvanece a medida que la descripción se abre (con detalles abiertos,
// like/pass solo por botones).
//
// La tarjeta superior se monta con `key` por item: cada tarjeta estrena sus
// shared values y no hay flashes al avanzar.

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
export type SwipeDeckHandle = {
  swipe: (choice: SwipeChoice) => void;
  toggleDetails: () => void;
};

// Parámetros del feel — ajustar aquí, no en las pantallas
const MAX_ROTATION_DEG = 12;
const THRESHOLD_FRACTION = 0.35;
const FLING_VELOCITY = 900;
const EXIT_TIMING = { duration: 260, reduceMotion: ReduceMotion.Never };
const RETURN_SPRING = { damping: 16, stiffness: 190, reduceMotion: ReduceMotion.Never };
const SHEET_SPRING = { damping: 19, stiffness: 200, reduceMotion: ReduceMotion.Never };
const NEXT_CARD_SCALE = 0.95;

type TopCardHandle = {
  fly: (dir: 1 | -1) => void;
  toggleSheet: () => void;
};

type TopCardProps = {
  width: number;
  height: number;
  enabled: boolean;
  progress: SharedValue<number>;
  likeLabel: string;
  passLabel: string;
  onSwiped: (choice: SwipeChoice) => void;
  card: ReactNode;
  details?: ReactNode;
};

const TopCard = forwardRef<TopCardHandle, TopCardProps>(function TopCard(
  { width, height, enabled, progress, likeLabel, passLabel, onSwiped, card, details },
  ref
) {
  const tx = useSharedValue(0);
  // 0 = tarjeta visible · 1 = descripción visible
  const sheet = useSharedValue(0);
  const sheetAtStart = useSharedValue(0);
  const threshold = width * THRESHOLD_FRACTION;
  const exitDistance = Math.max(width * 1.6, Dimensions.get('window').width * 1.1);
  const hasDetails = details !== undefined;

  const finish = (dir: number) => onSwiped(dir > 0 ? 'like' : 'pass');

  const fly = (dir: 1 | -1) => {
    tx.value = withTiming(dir * exitDistance, EXIT_TIMING, (done) => {
      if (done) runOnJS(finish)(dir);
    });
  };

  const toggleSheet = () => {
    sheet.value = withSpring(sheet.value > 0.5 ? 0 : 1, SHEET_SPRING);
  };

  useImperativeHandle(ref, () => ({ fly, toggleSheet }));

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onStart(() => {
      sheetAtStart.value = sheet.value;
    })
    .onUpdate((event) => {
      // La tira sigue al dedo en vertical (arriba abre, abajo cierra)
      if (hasDetails && height > 0) {
        sheet.value = Math.min(
          Math.max(sheetAtStart.value - event.translationY / height, 0),
          1
        );
      }
      // El swipe horizontal se desvanece a medida que la descripción se abre
      tx.value = event.translationX * (1 - sheet.value);
      progress.value = Math.min(Math.abs(tx.value) / threshold, 1);
    })
    .onEnd((event) => {
      const decided =
        sheet.value < 0.3 &&
        (Math.abs(tx.value) > threshold || Math.abs(event.velocityX) > FLING_VELOCITY);
      if (decided) {
        const dir = (tx.value !== 0 ? Math.sign(tx.value) : Math.sign(event.velocityX)) as 1 | -1;
        runOnJS(fly)(dir);
        return;
      }
      tx.value = withSpring(0, RETURN_SPRING);
      progress.value = withSpring(0, RETURN_SPRING);
      // La tira encaja en tarjeta o descripción según posición y velocidad
      const target =
        event.velocityY < -FLING_VELOCITY ? 1
        : event.velocityY > FLING_VELOCITY ? 0
        : sheet.value > 0.5 ? 1
        : 0;
      sheet.value = withSpring(hasDetails ? target : 0, SHEET_SPRING);
    });

  const frameStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      {
        rotate: `${interpolate(
          tx.value,
          [-width, 0, width],
          [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG]
        )}deg`,
      },
    ],
  }));

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -sheet.value * height }],
  }));

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(tx.value, [threshold * 0.15, threshold], [0, 1], Extrapolation.CLAMP) *
      (1 - sheet.value),
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(tx.value, [-threshold, -threshold * 0.15], [1, 0], Extrapolation.CLAMP) *
      (1 - sheet.value),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.frame, frameStyle]}>
        <Animated.View style={[styles.strip, stripStyle]}>
          <View style={styles.page}>{card}</View>
          {hasDetails && <View style={styles.page}>{details}</View>}
        </Animated.View>
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
  /** cara de descripción de la tira (desliza desde abajo) */
  renderDetails?: (item: T) => ReactNode;
  onSwiped: (item: T, choice: SwipeChoice) => void;
  enabled?: boolean;
  likeLabel?: string;
  passLabel?: string;
  /** ref imperativa para botones: swipe('like'|'pass') y toggleDetails() */
  deckRef?: MutableRefObject<SwipeDeckHandle | null>;
};

export function SwipeDeck<T>({
  items,
  index,
  keyFor,
  renderCard,
  renderDetails,
  onSwiped,
  enabled = true,
  likeLabel = 'ME INTERESA',
  passLabel = 'PASO',
  deckRef,
}: SwipeDeckProps<T>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);
  const topRef = useRef<TopCardHandle>(null);

  const current = items[index];
  const next = items[index + 1];

  useEffect(() => {
    if (!deckRef) return;
    deckRef.current = {
      swipe: (choice) => topRef.current?.fly(choice === 'like' ? 1 : -1),
      toggleDetails: () => topRef.current?.toggleSheet(),
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
      onLayout={(e) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }>
      {next !== undefined && (
        <Animated.View
          key={`next-${keyFor(next)}`}
          style={[StyleSheet.absoluteFill, styles.frame, nextCardStyle]}>
          {renderCard(next, false)}
        </Animated.View>
      )}
      {current !== undefined && size.width > 0 && (
        <TopCard
          key={keyFor(current)}
          ref={topRef}
          width={size.width}
          height={size.height}
          enabled={enabled}
          progress={progress}
          likeLabel={likeLabel}
          passLabel={passLabel}
          onSwiped={handleSwiped}
          card={renderCard(current, true)}
          details={renderDetails ? renderDetails(current) : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  frame: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '200%',
  },
  page: {
    height: '50%',
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
