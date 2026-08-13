// Panel de tirada del chat (pestaña 🎲): eliges dado, cantidad y
// modificador, ves la fórmula en vivo y la tirada se envía al chat como
// mensaje especial (kind 'roll').

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts, Spacing } from '@/constants/theme';
import {
  DICE_SIDES,
  MAX_DICE,
  MAX_MODIFIER,
  rollDice,
  rollFormula,
  type DiceRoll,
} from '@/lib/dice';

function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  format,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  format?: (v: number) => string;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepButton, value <= min && styles.stepDisabled]}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}>
          <Text style={styles.stepGlyph}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{format ? format(value) : value}</Text>
        <Pressable
          style={[styles.stepButton, value >= max && styles.stepDisabled]}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}>
          <Text style={styles.stepGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DiceRoller({ onRoll, busy }: { onRoll: (roll: DiceRoll) => void; busy: boolean }) {
  const [sides, setSides] = useState<number>(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);

  return (
    <View style={styles.panel}>
      <View style={styles.diceRow}>
        {DICE_SIDES.map((d) => (
          <Pressable
            key={d}
            style={[styles.die, sides === d && styles.dieSelected]}
            onPress={() => setSides(d)}>
            <Text style={[styles.dieLabel, sides === d && styles.dieLabelSelected]}>d{d}</Text>
          </Pressable>
        ))}
      </View>
      <Stepper label="Dados" value={count} onChange={setCount} min={1} max={MAX_DICE} />
      <Stepper
        label="Modificador"
        value={modifier}
        onChange={setModifier}
        min={-MAX_MODIFIER}
        max={MAX_MODIFIER}
        format={(v) => (v > 0 ? `+${v}` : String(v))}
      />
      <Pressable
        style={[styles.rollButton, busy && styles.rollDisabled]}
        onPress={() => onRoll(rollDice(count, sides, modifier))}
        disabled={busy}>
        <Text style={styles.rollLabel}>
          Tirar {rollFormula({ sides, count, modifier })}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  diceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  die: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  dieSelected: {
    backgroundColor: 'rgba(199,125,255,0.25)',
    borderColor: 'rgba(199,125,255,0.9)',
  },
  dieLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: RolderFonts.monoBold,
    fontWeight: '700',
  },
  dieLabelSelected: {
    color: '#E3C4FF',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(199,125,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.35,
  },
  stepGlyph: {
    color: Rolder.violetSofter,
    fontSize: 17,
    lineHeight: 20,
  },
  stepValue: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    minWidth: 34,
    textAlign: 'center',
  },
  rollButton: {
    backgroundColor: Rolder.violet,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rollDisabled: {
    opacity: 0.5,
  },
  rollLabel: {
    color: '#fff',
    fontSize: 14.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
});
