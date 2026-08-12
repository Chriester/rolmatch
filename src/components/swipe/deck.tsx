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

import { hapticArm, hapticSwipe } from '@/lib/haptics';
import Animated, {
  Easing,
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
// 25% del ancho decide (tweak del handoff rolder; era 35%)
const THRESHOLD_FRACTION = 0.25;
const FLING_VELOCITY = 900;
const EXIT_TIMING = { duration: 260, reduceMotion: ReduceMotion.Never };
// Horizontal: muelle rígido con un pelín de baile (permitido por diseño)
const RETURN_SPRING = { damping: 20, stiffness: 260, reduceMotion: ReduceMotion.Never };
// Vertical: SIN rebote — timing seco con easing de salida
const SHEET_TIMING = {
  duration: 210,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.Never,
};
const NEXT_CARD_SCALE = 0.95;
// Bloqueo de eje: se decide con el primer movimiento; las diagonales
// cuentan como like/pass (solo lo claramente vertical mueve la tira)
const AXIS_LOCK_DISTANCE = 12;
const VERTICAL_BIAS = 1.4;
// Tirar hacia abajo (tarjeta cerrada) = recargar el feed: el dedo arrastra
// con resistencia hasta un tope y al soltar pasado el umbral se dispara
const PULL_RESISTANCE = 2.4;
const PULL_MAX = 96;
const PULL_TRIGGER = 64;

type TopCardHandle = {
  fly: (dir: 1 | -1) => void;
  toggleSheet: () => void;
};

type TopCardProps = {
  width: number;
  height: number;
  enabled: boolean;
  progress: SharedValue<number>;
  /** px de tirón hacia abajo — vive en el deck: el mazo ENTERO baja con él
      (si solo bajara la tarjeta superior, la siguiente asomaría por arriba) */
  pull: SharedValue<number>;
  likeLabel: string;
  passLabel: string;
  onSwiped: (choice: SwipeChoice) => void;
  card: ReactNode;
  details?: ReactNode;
  /** tirar hacia abajo con la tarjeta cerrada dispara esto (recargar) */
  onPullRefresh?: () => void;
};

const TopCard = forwardRef<TopCardHandle, TopCardProps>(function TopCard(
  {
    width,
    height,
    enabled,
    progress,
    pull,
    likeLabel,
    passLabel,
    onSwiped,
    card,
    details,
    onPullRefresh,
  },
  ref
) {
  const tx = useSharedValue(0);
  // 0 = tarjeta visible · 1 = descripción visible
  const sheet = useSharedValue(0);
  const sheetAtStart = useSharedValue(0);
  // 0 = sin decidir · 1 = horizontal (like/pass) · 2 = vertical (tira)
  const axis = useSharedValue(0);
  // 1 mientras el arrastre supera el umbral (para el tick háptico)
  const armed = useSharedValue(0);
  const pullArmed = useSharedValue(0);
  const threshold = width * THRESHOLD_FRACTION;
  const exitDistance = Math.max(width * 1.6, Dimensions.get('window').width * 1.1);
  const hasDetails = details !== undefined;
  // booleano capturable por los worklets (la función en sí va por runOnJS)
  const canPull = onPullRefresh !== undefined;

  const finish = (dir: number) => onSwiped(dir > 0 ? 'like' : 'pass');

  const triggerRefresh = () => {
    hapticSwipe();
    onPullRefresh?.();
  };

  const fly = (dir: 1 | -1) => {
    hapticSwipe();
    // La tarjeta de abajo crece DURANTE el vuelo (clave con botones, donde
    // progress no se ha movido): al promocionarse ya mide 1 y no hay salto.
    progress.value = withTiming(1, EXIT_TIMING);
    tx.value = withTiming(dir * exitDistance, EXIT_TIMING, (done) => {
      if (done) runOnJS(finish)(dir);
    });
  };

  const toggleSheet = () => {
    sheet.value = withTiming(sheet.value > 0.5 ? 0 : 1, SHEET_TIMING);
  };

  useImperativeHandle(ref, () => ({ fly, toggleSheet }));

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onStart(() => {
      sheetAtStart.value = sheet.value;
      axis.value = 0;
    })
    .onUpdate((event) => {
      // Bloqueo de eje: el primer movimiento decide y el gesto se queda ahí.
      if (axis.value === 0) {
        const dx = Math.abs(event.translationX);
        const dy = Math.abs(event.translationY);
        if (dx > AXIS_LOCK_DISTANCE || dy > AXIS_LOCK_DISTANCE) {
          // Con la descripción abierta solo hay gesto vertical (cerrarla)
          if (sheet.value > 0.5) axis.value = 2;
          else axis.value = dy > dx * VERTICAL_BIAS ? 2 : 1;
        }
      }
      if (axis.value === 1) {
        tx.value = event.translationX;
        progress.value = Math.min(Math.abs(tx.value) / threshold, 1);
        // Tick háptico al armar el sello (una vez por cruce del umbral)
        const isArmed = Math.abs(tx.value) > threshold ? 1 : 0;
        if (isArmed !== armed.value) {
          armed.value = isArmed;
          if (isArmed === 1) runOnJS(hapticArm)();
        }
      } else if (axis.value === 2) {
        // Con la tarjeta cerrada, el tramo hacia abajo es el tirón de
        // recarga (resistencia + tope); hacia arriba sigue abriendo la tira
        if (canPull && sheetAtStart.value === 0) {
          pull.value = Math.min(Math.max(event.translationY, 0) / PULL_RESISTANCE, PULL_MAX);
          const isPullArmed = pull.value > PULL_TRIGGER ? 1 : 0;
          if (isPullArmed !== pullArmed.value) {
            pullArmed.value = isPullArmed;
            if (isPullArmed === 1) runOnJS(hapticArm)();
          }
        }
        if (hasDetails && height > 0) {
          sheet.value = Math.min(
            Math.max(sheetAtStart.value - event.translationY / height, 0),
            1
          );
        }
      }
    })
    .onEnd((event, success) => {
      if (axis.value === 1) {
        const decided =
          sheet.value < 0.3 &&
          (Math.abs(tx.value) > threshold || Math.abs(event.velocityX) > FLING_VELOCITY);
        if (decided) {
          const dir = (tx.value !== 0 ? Math.sign(tx.value) : Math.sign(event.velocityX)) as
            | 1
            | -1;
          axis.value = 0;
          runOnJS(fly)(dir);
          return;
        }
        tx.value = withSpring(0, RETURN_SPRING);
        progress.value = withSpring(0, RETURN_SPRING);
      } else if (axis.value === 2) {
        // La tira encaja seca, sin rebote, según posición y velocidad
        const target =
          event.velocityY < -FLING_VELOCITY ? 1
          : event.velocityY > FLING_VELOCITY ? 0
          : sheet.value > 0.5 ? 1
          : 0;
        sheet.value = withTiming(hasDetails ? target : 0, SHEET_TIMING);
        // Tirón SOLTADO a propósito pasado el umbral: recarga. `success`
        // filtra los gestos que cancela el sistema (cortinilla de Android,
        // llamada entrante…) — cancelar no debe costarte el mazo entero.
        if (success && pull.value > PULL_TRIGGER) runOnJS(triggerRefresh)();
      }
      axis.value = 0;
    })
    // onFinalize corre SIEMPRE (fin, cancelación o fallo): el tirón nunca
    // debe quedarse a medias aunque el gesto muera sin onEnd
    .onFinalize(() => {
      pull.value = withTiming(0, SHEET_TIMING);
      pullArmed.value = 0;
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

  // Indicador del tirón: aparece con el arrastre y gira hasta armarse
  const pullBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pull.value, [8, PULL_TRIGGER], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: `${interpolate(pull.value, [0, PULL_MAX], [0, 180])}deg` },
      { scale: interpolate(pull.value, [PULL_TRIGGER, PULL_MAX], [1, 1.15], Extrapolation.CLAMP) },
    ],
  }));

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -sheet.value * height }],
  }));

  // Legibles desde el primer centímetro: opacidad completa a mitad del
  // umbral y pop de escala 0.8→1 (la rotación va aquí porque el transform
  // animado pisa al estático).
  const likeStampStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(tx.value, [threshold * 0.1, threshold * 0.5], [0, 1], Extrapolation.CLAMP) *
      (1 - sheet.value),
    transform: [
      { rotate: '8deg' },
      {
        scale: interpolate(
          tx.value,
          [threshold * 0.1, threshold * 0.5],
          [0.8, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(tx.value, [-threshold * 0.5, -threshold * 0.1], [1, 0], Extrapolation.CLAMP) *
      (1 - sheet.value),
    transform: [
      { rotate: '-7deg' },
      {
        scale: interpolate(
          tx.value,
          [-threshold * 0.5, -threshold * 0.1],
          [1, 0.8],
          Extrapolation.CLAMP
        ),
      },
    ],
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
        {canPull && (
          <Animated.View style={[styles.pullBadge, pullBadgeStyle]}>
            <Text style={styles.pullGlyph}>↻</Text>
          </Animated.View>
        )}
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
  /** tirar hacia abajo con la tarjeta cerrada dispara esto (recargar) */
  onPullRefresh?: () => void;
};

export function SwipeDeck<T>({
  items,
  index,
  keyFor,
  renderCard,
  renderDetails,
  onSwiped,
  enabled = true,
  likeLabel = '🎲 ¡CRÍTICO!',
  passLabel = '💀 PIFIA',
  deckRef,
  onPullRefresh,
}: SwipeDeckProps<T>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(0);
  // el tirón de recarga baja el mazo COMPLETO (tarjeta + siguiente): si solo
  // bajara la superior, la de detrás asomaría por el hueco de arriba
  const pull = useSharedValue(0);
  const topRef = useRef<TopCardHandle>(null);

  const current = items[index];
  const next = items[index + 1];
  const currentKey = current !== undefined ? keyFor(current) : null;

  // El reset de la escala va DESPUÉS del commit: la que era "siguiente" ya
  // es principal (misma escala 1 → promoción sin salto) y la nueva
  // "siguiente" nace detrás de una tarjeta opaca, así que su ajuste a 0.95
  // no se ve. Resetear antes era el bump que se notaba al swipear.
  useEffect(() => {
    progress.value = 0;
    // si la tarjeta se desmontó con el dedo puesto (recarga a mitad de
    // tirón), su onFinalize ya no corre: el mazo no debe nacer hundido
    pull.value = 0;
  }, [currentKey, progress, pull]);

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
    // OJO: aquí NO se resetea progress. Hacerlo en este instante encogía la
    // tarjeta de abajo (1 → 0.95) durante los frames que React tarda en
    // promocionarla, y se veía como un rebote. El reset vive en el efecto de
    // abajo, después del commit, cuando la nueva "siguiente" ya está tapada.
    if (current !== undefined) onSwiped(current, choice);
  };

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [NEXT_CARD_SCALE, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const deckShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pull.value }],
  }));

  return (
    <View
      style={styles.container}
      onLayout={(e) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }>
      <Animated.View style={[StyleSheet.absoluteFill, deckShiftStyle]}>
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
            pull={pull}
            likeLabel={likeLabel}
            passLabel={passLabel}
            onSwiped={handleSwiped}
            card={renderCard(current, true)}
            details={renderDetails ? renderDetails(current) : undefined}
            onPullRefresh={onPullRefresh}
          />
        )}
      </Animated.View>
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
  // Sellos estilo sticker (handoff rolder §1). ⚠️ Posiciones invertidas
  // respecto a Tinder — decisión de diseño: CRÍTICO arriba-DERECHA.
  stamp: {
    position: 'absolute',
    top: 64,
    borderWidth: 3,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  // Retranqueados hacia el centro: en móvil quedan siempre a la vista
  // aunque la tarjeta se desplace y rote con el arrastre.
  stampLike: {
    right: '14%',
    backgroundColor: '#3BD16F',
    borderColor: '#0B2416',
    boxShadow: '4px 4px 0 rgba(0,0,0,0.35)',
  },
  stampPass: {
    left: '14%',
    backgroundColor: '#FF5A5F',
    borderColor: '#3D0A0C',
    boxShadow: '4px 4px 0 rgba(0,0,0,0.35)',
  },
  stampText: {
    fontSize: 19,
    fontFamily: 'Nunito_900Black',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stampTextLike: {
    color: '#0B2416',
  },
  stampTextPass: {
    color: '#3D0A0C',
  },
  pullBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11,11,18,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pullGlyph: {
    color: '#B9A6FF',
    fontSize: 20,
    fontWeight: '700',
  },
});
