// Mini-visualización semanal (7 días × 4 franjas) para el panel de detalles:
// celdas activas = disponibilidad; celda destacada = sesión de la mesa;
// si coinciden, se pintan en verde (el solape que decide el match).

import { StyleSheet, Text, View } from 'react-native';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const SLOTS = ['Mañana', 'Tarde', 'Noche', 'Madrug.'];

export function availabilityCellKey(weekday: number, slot: number) {
  return `${weekday}-${slot}`;
}

type AvailabilityMiniGridProps = {
  /** claves `${weekday}-${slot}` de disponibilidad */
  cells: Set<string>;
  /** sesión a destacar (p. ej. la de la mesa) */
  highlight?: { weekday: number; slot: number } | null;
};

export function AvailabilityMiniGrid({ cells, highlight }: AvailabilityMiniGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <View style={styles.slotLabel} />
        {DAYS.map((d) => (
          <Text key={d} style={styles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>
      {SLOTS.map((slotName, slot) => (
        <View key={slotName} style={styles.row}>
          <Text style={styles.slotLabel}>{slotName}</Text>
          {DAYS.map((_, weekday) => {
            const active = cells.has(availabilityCellKey(weekday, slot));
            const isSession = highlight?.weekday === weekday && highlight?.slot === slot;
            return (
              <View
                key={weekday}
                style={[
                  styles.cell,
                  active && styles.cellActive,
                  isSession && styles.cellSession,
                  active && isSession && styles.cellOverlap,
                ]}
              />
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <View style={[styles.legendDot, styles.cellActive]} />
        <Text style={styles.legendText}>disponibilidad</Text>
        {highlight && (
          <>
            <View style={[styles.legendDot, styles.cellOverlap]} />
            <Text style={styles.legendText}>sesión coincidente</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 3,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '700',
  },
  slotLabel: {
    width: 56,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
  },
  cell: {
    flex: 1,
    height: 18,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  cellActive: {
    backgroundColor: 'rgba(139,108,255,0.5)',
  },
  cellSession: {
    backgroundColor: 'rgba(59,209,111,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  cellOverlap: {
    backgroundColor: '#3BD16F',
    borderWidth: 0,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginRight: 8,
  },
});
