// TableTabs (rediseño de mesas, entregable §1): la mesa como hub de UNA
// sola página. Mesa · Chat · Agenda · Diario no navegan a ningún sitio:
// cambian qué panel se monta debajo, con la cabecera de la mesa siempre
// presente. Sustituye a los cuatro accesos circulares sin etiqueta.
//
// La píldora activa DESLIZA entre pestañas (todas miden lo mismo: flex 1,
// así que basta con animar translateX) en vez de teletransportarse.
//
// Variante bloqueada (visitante): 🔒 en las tres privadas; se enseñan en
// vez de ocultarse porque el candado vende — ves qué ganas al entrar.

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Rolder, RolderFonts } from '@/constants/theme';

export type TableTabKey = 'mesa' | 'chat' | 'agenda' | 'diario';

const TABS: { key: TableTabKey; label: string }[] = [
  { key: 'mesa', label: 'Mesa' },
  { key: 'chat', label: 'Chat' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'diario', label: 'Diario' },
];

const ROW_PADDING = 4;
const TAB_GAP = 4;
const ROW_BORDER = 1;

type TableTabsProps = {
  active: TableTabKey;
  onSelect: (tab: TableTabKey) => void;
  /** no leídos del chat: badge numérico (solo si > 0) */
  unread?: number;
  /** visitante sin plaza: solo Mesa es navegable, el resto con candado */
  locked?: boolean;
};

export function TableTabs({ active, onSelect, unread = 0, locked = false }: TableTabsProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const pillX = useSharedValue(0);
  const settled = useRef(false);

  // onLayout mide el ancho CON borde; el interior útil lo descuenta
  const tabWidth =
    rowWidth > 0
      ? (rowWidth - (ROW_BORDER + ROW_PADDING) * 2 - TAB_GAP * (TABS.length - 1)) / TABS.length
      : 0;
  const index = TABS.findIndex((tab) => tab.key === active);

  useEffect(() => {
    if (tabWidth <= 0) return;
    const target = index * (tabWidth + TAB_GAP);
    if (!settled.current) {
      // primera medida (o deep link a otra pestaña): colocar sin viaje
      settled.current = true;
      pillX.value = target;
      return;
    }
    pillX.value = withTiming(target, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      // los efectos del sistema apagados no deben congelar la píldora
      reduceMotion: ReduceMotion.Never,
    });
  }, [index, tabWidth, pillX]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));

  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
      {tabWidth > 0 && <Animated.View style={[styles.pill, { width: tabWidth }, pillStyle]} />}
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const isLocked = locked && tab.key !== 'mesa';
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            aria-selected={isActive}
            accessibilityLabel={isLocked ? `${tab.label}, se desbloquea al entrar` : tab.label}
            disabled={isActive || isLocked}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            onPress={() => onSelect(tab.key)}>
            <Text
              style={[styles.label, isActive && styles.labelActive, isLocked && styles.labelLocked]}
              numberOfLines={1}>
              {tab.label}
              {isLocked ? ' 🔒' : ''}
            </Text>
            {tab.key === 'chat' && unread > 0 && !isLocked && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99' : unread}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    padding: ROW_PADDING,
    gap: TAB_GAP,
  },
  // la píldora vive debajo de las etiquetas y se desliza entre pestañas
  pill: {
    position: 'absolute',
    left: ROW_PADDING,
    top: ROW_PADDING,
    bottom: ROW_PADDING,
    borderRadius: 10,
    backgroundColor: 'rgba(199,125,255,0.22)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 38,
    borderRadius: 10,
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
  },
  labelLocked: {
    color: Rolder.textTertiary,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Rolder.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '800',
  },
});
