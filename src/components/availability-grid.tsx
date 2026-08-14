import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // weekday 0 = lunes (igual que en DB)
const SLOTS = [
  { id: 0, label: 'Mañana' },
  { id: 1, label: 'Tarde' },
  { id: 2, label: 'Noche' },
  { id: 3, label: 'Madrugada' },
];

export function availabilityKey(weekday: number, slot: number) {
  return `${weekday}-${slot}`;
}

type AvailabilityGridProps = {
  selected: Set<string>;
  onToggle: (weekday: number, slot: number) => void;
};

type Cell = { weekday: number; slot: number };
type Rect = { start: number; size: number };

/**
 * Matriz día × franja (§4.1). Toca una celda o DEJA PULSADO Y ARRASTRA para
 * pintar varias: la primera celda del arrastre decide si pintas o borras.
 * El tap normal lo siguen gestionando los Pressable (y su accesibilidad);
 * el PanResponder solo reclama el gesto cuando hay movimiento real.
 */
export function AvailabilityGrid({ selected, onToggle }: AvailabilityGridProps) {
  const containerRef = useRef<View>(null);
  // rects medidos de filas (y) y columnas (x) relativos a la grid — el
  // hit-testing del arrastre no depende así de gaps ni tamaños de fuente
  const rowRects = useRef(new Map<number, Rect>());
  const colRects = useRef(new Map<number, Rect>());
  const origin = useRef({ x: 0, y: 0 });
  const paintValue = useRef(false);
  const painted = useRef(new Set<string>());
  // refs espejo: los handlers del PanResponder se crean una sola vez
  const selectedRef = useRef(selected);
  const onToggleRef = useRef(onToggle);

  useEffect(() => {
    selectedRef.current = selected;
    onToggleRef.current = onToggle;
  }, [selected, onToggle]);

  const responder = useMemo(() => {
    const cellAt = (x: number, y: number): Cell | null => {
      let slot: number | null = null;
      for (const [id, rect] of rowRects.current) {
        if (y >= rect.start && y <= rect.start + rect.size) slot = id;
      }
      let weekday: number | null = null;
      for (const [day, rect] of colRects.current) {
        if (x >= rect.start && x <= rect.start + rect.size) weekday = day;
      }
      return slot !== null && weekday !== null ? { weekday, slot } : null;
    };

    const paint = (cell: Cell) => {
      const key = availabilityKey(cell.weekday, cell.slot);
      if (painted.current.has(key)) return;
      painted.current.add(key);
      if (selectedRef.current.has(key) !== paintValue.current) {
        onToggleRef.current(cell.weekday, cell.slot);
      }
    };

    // Patrón PanResponder de RN: los callbacks solo leen refs durante el gesto
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      // solo reclama con movimiento real: el tap simple sigue en los Pressable
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_evt, gesture) => {
        painted.current.clear();
        containerRef.current?.measureInWindow((x, y) => {
          origin.current = { x, y };
          const cell = cellAt(gesture.x0 - x, gesture.y0 - y);
          if (cell) {
            paintValue.current = !selectedRef.current.has(
              availabilityKey(cell.weekday, cell.slot)
            );
            paint(cell);
          }
        });
      },
      onPanResponderMove: (_evt, gesture) => {
        const cell = cellAt(gesture.moveX - origin.current.x, gesture.moveY - origin.current.y);
        if (cell) paint(cell);
      },
    });
  }, []);

  return (
    <View
      ref={containerRef}
      // touchAction: en web móvil el navegador haría scroll nativo y el
      // arrastre nunca llegaría al responder; dentro de la grid, lo cortamos
      style={[styles.grid, Platform.OS === 'web' && ({ touchAction: 'none' } as object)]}
      {...responder.panHandlers}>
      <View style={styles.row}>
        <View style={styles.slotLabel} />
        {DAYS.map((day, weekday) => (
          <ThemedText key={weekday} type="small" style={styles.dayHeader}>
            {day}
          </ThemedText>
        ))}
      </View>
      {SLOTS.map((slot) => (
        <View
          key={slot.id}
          style={styles.row}
          onLayout={(e) =>
            rowRects.current.set(slot.id, {
              start: e.nativeEvent.layout.y,
              size: e.nativeEvent.layout.height,
            })
          }>
          <ThemedText type="small" style={styles.slotLabel}>
            {slot.label}
          </ThemedText>
          {DAYS.map((_, weekday) => {
            const isSelected = selected.has(availabilityKey(weekday, slot.id));
            return (
              <Pressable
                key={weekday}
                style={[styles.cell, isSelected && styles.cellSelected]}
                onPress={() => onToggle(weekday, slot.id)}
                onLayout={
                  slot.id === 0
                    ? (e) =>
                        colRects.current.set(weekday, {
                          start: e.nativeEvent.layout.x,
                          size: e.nativeEvent.layout.width,
                        })
                    : undefined
                }
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${slot.label}, día ${DAYS[weekday]}`}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
  },
  slotLabel: {
    width: 88,
  },
  cell: {
    flex: 1,
    aspectRatio: 1.4,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.one,
  },
  cellSelected: {
    backgroundColor: '#5D4A93',
    borderColor: '#5D4A93',
  },
});
