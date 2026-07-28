// Calendario de mes ligero (sin dependencias): navegación ‹ › y selección
// de días por toque — single o múltiple. Los días pasados se deshabilitan.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** clave AAAA-MM-DD en hora local */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type CalendarPickerProps = {
  selected: Set<string>;
  onToggle: (key: string) => void;
};

export function CalendarPicker({ selected, onToggle }: CalendarPickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0 = domingo → columna 6 con semana empezando en lunes
  const firstColumn = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstColumn }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const atCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setCursor(new Date(year, month - 1, 1))}
          disabled={atCurrentMonth}
          style={styles.navButton}>
          <Text style={[styles.nav, atCurrentMonth && styles.navDisabled]}>‹</Text>
        </Pressable>
        <Text style={styles.month}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={() => setCursor(new Date(year, month + 1, 1))} style={styles.navButton}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={styles.cell} />;
          const key = dayKey(date);
          const isPast = date.getTime() < today.getTime();
          const isSelected = selected.has(key);
          const isToday = date.getTime() === today.getTime();
          return (
            <Pressable
              key={i}
              style={styles.cell}
              disabled={isPast}
              onPress={() => onToggle(key)}>
              <View
                style={[
                  styles.day,
                  isToday && styles.today,
                  isSelected && styles.daySelected,
                ]}>
                <Text
                  style={[
                    styles.dayLabel,
                    isPast && styles.dayPast,
                    isSelected && styles.dayLabelSelected,
                  ]}>
                  {date.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  nav: {
    color: Rolder.violetSoft,
    fontSize: 22,
    fontFamily: RolderFonts.bold,
  },
  navDisabled: {
    opacity: 0.25,
  },
  month: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: Rolder.textTertiary,
    fontSize: 10.5,
    fontFamily: RolderFonts.semibold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  day: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.6)',
  },
  daySelected: {
    backgroundColor: Rolder.violet,
  },
  dayLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
  },
  dayPast: {
    color: 'rgba(255,255,255,0.25)',
  },
  dayLabelSelected: {
    color: '#fff',
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
});
