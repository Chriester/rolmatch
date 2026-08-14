// StatChip (rediseño de mesas, entregable §2): pill de pendiente — «💬 2
// nuevos», «⚔️ 3 piden sitio», «📅 Te falta votar fecha». Regla dura del
// entregable: solo aparece cuando hay algo que contar — nunca un «0 nuevos».
// Es informativo, no un target táctil (los toques van en la fila que lo
// contiene); por eso no es Pressable.

import { StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';

export type StatChipTone = 'green' | 'violet' | 'amber' | 'coral';

const TONES: Record<StatChipTone, { bg: string; border: string; text: string }> = {
  green: { bg: Rolder.likeChipBg, border: Rolder.likeChipBorder, text: Rolder.likeChipText },
  violet: {
    bg: 'rgba(199,125,255,0.18)',
    border: 'rgba(199,125,255,0.55)',
    text: Rolder.violetSofter,
  },
  amber: { bg: 'rgba(232,164,76,0.15)', border: 'rgba(232,164,76,0.5)', text: '#F0BE7A' },
  coral: { bg: 'rgba(229,72,77,0.15)', border: 'rgba(229,72,77,0.5)', text: '#FF8A8E' },
};

export function StatChip({ label, tone = 'violet' }: { label: string; tone?: StatChipTone }) {
  const palette = TONES[tone];
  return (
    <View
      style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}
      accessibilityLabel={label}>
      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
  },
});
