// Burbuja especial de tirada en el chat: fórmula, cada dado como ficha
// (máximo en verde, pifia en rojo) y el total en grande. Distinta a
// propósito de un mensaje normal: borde dorado y fondo propio.

import { StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';
import { rollFormula, type DiceRoll } from '@/lib/dice';

export function RollBubble({
  roll,
  senderAlias,
}: {
  roll: DiceRoll;
  /** en el chat de mesa, el alias de quien tira (en DM sobra) */
  senderAlias?: string | null;
}) {
  return (
    <View style={styles.card}>
      {senderAlias ? <Text style={styles.sender}>{senderAlias}</Text> : null}
      <View style={styles.headerRow}>
        <Text style={styles.formula}>🎲 {rollFormula(roll)}</Text>
        <Text style={styles.total}>{roll.total}</Text>
      </View>
      <View style={styles.diceRow}>
        {roll.rolls.map((value, i) => (
          <View
            key={i}
            style={[
              styles.die,
              value === roll.sides && styles.dieMax,
              value === 1 && styles.dieMin,
            ]}>
            <Text
              style={[
                styles.dieValue,
                value === roll.sides && styles.dieValueMax,
                value === 1 && styles.dieValueMin,
              ]}>
              {value}
            </Text>
          </View>
        ))}
        {roll.modifier !== 0 && (
          <Text style={styles.modifier}>
            {roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // sin maxWidth propio: lo limita el messageCol del chat (un % aquí
    // se resolvería contra un padre content-sized y desbordaría)
    maxWidth: '100%',
    backgroundColor: 'rgba(232,164,76,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(232,164,76,0.45)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 13,
    gap: 8,
  },
  sender: {
    color: Rolder.violetSoft,
    fontSize: 11,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  formula: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13.5,
    fontFamily: RolderFonts.monoBold,
    fontWeight: '700',
  },
  total: {
    color: Rolder.gold,
    fontSize: 24,
    fontFamily: RolderFonts.monoBold,
    fontWeight: '800',
  },
  diceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
  },
  die: {
    minWidth: 30,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  dieMax: {
    borderColor: 'rgba(63,191,143,0.8)',
    backgroundColor: 'rgba(63,191,143,0.12)',
  },
  dieMin: {
    borderColor: 'rgba(229,72,77,0.8)',
    backgroundColor: 'rgba(229,72,77,0.12)',
  },
  dieValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.mono,
    fontWeight: '700',
  },
  dieValueMax: {
    color: Rolder.like,
  },
  dieValueMin: {
    color: Rolder.pass,
  },
  modifier: {
    color: Rolder.textSecondary,
    fontSize: 14,
    fontFamily: RolderFonts.mono,
    fontWeight: '700',
    marginLeft: 3,
  },
});
