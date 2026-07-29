// Chip seleccionable — patrón global del handoff rolder §7:
// seleccionado violeta translúcido, no seleccionado gris translúcido.

import { Pressable, StyleSheet, Text } from 'react-native';

import { RolderFonts, Spacing } from '@/constants/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** visible pero no elegible (placeholder de «próximamente») */
  disabled?: boolean;
};

export function Chip({ label, selected, onPress, disabled }: ChipProps) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
  },
  chipSelected: {
    backgroundColor: 'rgba(139,108,255,0.3)',
    borderColor: 'rgba(139,108,255,0.8)',
  },
  chipDisabled: {
    opacity: 0.45,
    borderStyle: 'dashed',
  },
  label: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  labelSelected: {
    color: '#CBBAFF',
  },
});
