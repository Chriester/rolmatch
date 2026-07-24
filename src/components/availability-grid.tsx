import { Pressable, StyleSheet, View } from 'react-native';

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

/** Matriz día × franja (§4.1). Las celdas marcadas son la disponibilidad del usuario. */
export function AvailabilityGrid({ selected, onToggle }: AvailabilityGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <View style={styles.slotLabel} />
        {DAYS.map((day, weekday) => (
          <ThemedText key={weekday} type="small" style={styles.dayHeader}>
            {day}
          </ThemedText>
        ))}
      </View>
      {SLOTS.map((slot) => (
        <View key={slot.id} style={styles.row}>
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
    backgroundColor: '#5865F2',
    borderColor: '#5865F2',
  },
});
