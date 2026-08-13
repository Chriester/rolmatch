// Selector de hora sin dependencias nativas: pill HH:MM que abre un modal
// con horas (rejilla 00-23) y minutos (00/15/30/45). Sirve tanto para la
// «hora para todas» como para ajustar cada fecha individual al organizar.

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts, Spacing } from '@/constants/theme';

export type TimeValue = { hour: number; minute: number };

export function formatTime({ hour, minute }: TimeValue): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hour)}:${pad(minute)}`;
}

const MINUTES = [0, 15, 30, 45];

export function TimeField({
  value,
  onChange,
  compact,
}: {
  value: TimeValue;
  onChange: (next: TimeValue) => void;
  /** pill pequeña para las filas por-fecha */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={[styles.pill, compact && styles.pillCompact]}
        onPress={() => setOpen(true)}
        accessibilityLabel={`Hora: ${formatTime(value)}`}>
        <Text style={[styles.pillLabel, compact && styles.pillLabelCompact]}>
          🕐 {formatTime(value)}
        </Text>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Hora de la partida</Text>
            <View style={styles.hourGrid}>
              {Array.from({ length: 24 }, (_, hour) => (
                <Pressable
                  key={hour}
                  style={[styles.hourCell, value.hour === hour && styles.cellSelected]}
                  onPress={() => onChange({ ...value, hour })}>
                  <Text
                    style={[styles.cellLabel, value.hour === hour && styles.cellLabelSelected]}>
                    {String(hour).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.minuteRow}>
              {MINUTES.map((minute) => (
                <Pressable
                  key={minute}
                  style={[styles.minuteCell, value.minute === minute && styles.cellSelected]}
                  onPress={() => onChange({ ...value, minute })}>
                  <Text
                    style={[
                      styles.cellLabel,
                      value.minute === minute && styles.cellLabelSelected,
                    ]}>
                    :{String(minute).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.doneButton} onPress={() => setOpen(false)}>
              <Text style={styles.doneLabel}>Listo · {formatTime(value)}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.5)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  pillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  pillLabelCompact: {
    fontSize: 12.5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 18,
    padding: 16,
    gap: Spacing.three,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  hourCell: {
    width: 44,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  minuteRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  minuteCell: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cellSelected: {
    backgroundColor: 'rgba(199,125,255,0.3)',
    borderColor: 'rgba(199,125,255,0.9)',
  },
  cellLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
  },
  cellLabelSelected: {
    color: '#E3C4FF',
  },
  doneButton: {
    backgroundColor: Rolder.violet,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  doneLabel: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
});
