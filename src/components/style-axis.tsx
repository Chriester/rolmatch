import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const STYLE_STEPS = [0, 25, 50, 75, 100];

type StyleAxisProps = {
  left: string;
  right: string;
  value: number;
  onChange: (value: number) => void;
};

/** Eje de estilo de juego 0-100 en 5 pasos (§4.1 del PRD). */
export function StyleAxis({ left, right, value, onChange }: StyleAxisProps) {
  return (
    <View style={styles.axis}>
      <View style={styles.axisLabels}>
        <ThemedText type="small">{left}</ThemedText>
        <ThemedText type="small">{right}</ThemedText>
      </View>
      <View style={styles.axisDots}>
        {STYLE_STEPS.map((step) => (
          <Pressable
            key={step}
            style={[styles.dot, value === step && styles.dotSelected]}
            onPress={() => onChange(step)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === step }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: {
    gap: Spacing.two,
  },
  axisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#666',
  },
  dotSelected: {
    backgroundColor: '#5D4A93',
    borderColor: '#5D4A93',
  },
});
