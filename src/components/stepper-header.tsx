// StepperHeader (rediseño de mesas, entregable §9): progreso de N segmentos
// con etiqueta de paso, para formularios largos partidos en pantallas
// cortas. Once campos en un scroll producen abandono; tres pasos con
// progreso visible se terminan.

import { StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';

type StepperHeaderProps = {
  steps: string[];
  /** índice 0-based del paso actual */
  current: number;
};

export function StepperHeader({ steps, current }: StepperHeaderProps) {
  return (
    <View style={styles.wrap} accessibilityLabel={`Paso ${current + 1} de ${steps.length}: ${steps[current]}`}>
      <View style={styles.track}>
        {steps.map((step, index) => (
          <View
            key={step}
            style={[
              styles.segment,
              index < current && styles.segmentDone,
              index === current && styles.segmentActive,
            ]}
          />
        ))}
      </View>
      <View style={styles.labels}>
        <Text style={styles.stepCount}>
          Paso {current + 1} de {steps.length}
        </Text>
        <Text style={styles.stepName}>{steps[current]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  track: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  segmentDone: {
    backgroundColor: 'rgba(199,125,255,0.55)',
  },
  segmentActive: {
    backgroundColor: Rolder.violet,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  stepCount: {
    color: Rolder.textTertiary,
    fontSize: 11.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  stepName: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
  },
});
