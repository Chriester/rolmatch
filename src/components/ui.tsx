// Primitivas de UI del rediseño rolder: títulos, etiquetas de sección,
// botones y filas de lista. Todas las pantallas construyen sobre esto
// (tokens en constants/theme.ts; spec en docs/design-rolder/README.md).

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';
import type { LevelInfo } from '@/lib/xp';

/** Título de pantalla (20/800 según handoff) */
export function ScreenTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.screenTitle}>{children}</Text>;
}

/** Subtítulo/blurb bajo el título */
export function ScreenBlurb({ children }: { children: ReactNode }) {
  return <Text style={styles.screenBlurb}>{children}</Text>;
}

/** Label de sección: 11/700 uppercase violeta */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Text style={[styles.sectionLabel, style as object]}>{children}</Text>;
}

/** Botón primario verde con gradiente (like/guardar/publicar) */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [disabled && styles.disabled, pressed && styles.pressed, style]}>
      {/* CTA primario = gradiente de marca (Roldr: uno por pantalla; el
          verde queda para éxito y swipe-yes) */}
      <LinearGradient
        colors={Rolder.brandGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primary}>
        <Text style={styles.primaryLabel}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** Botón outline violeta (secundario) */
export function OutlineButton({
  label,
  onPress,
  disabled,
  tone = 'violet',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'violet' | 'white' | 'red' | 'gold';
  style?: StyleProp<ViewStyle>;
}) {
  const border =
    tone === 'violet' ? 'rgba(199,125,255,0.8)'
    : tone === 'red' ? Rolder.pass
    : tone === 'gold' ? Rolder.gold
    : 'rgba(255,255,255,0.3)';
  const color =
    tone === 'violet' ? Rolder.violetSofter
    : tone === 'red' ? Rolder.pass
    : tone === 'gold' ? Rolder.goldLight
    : 'rgba(255,255,255,0.85)';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.outline,
        { borderColor: border },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      <Text style={[styles.outlineLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Botón sólido Discord */
export function DiscordButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.discord, pressed && styles.pressed]}>
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

/** Fila/tarjeta de lista (superficie #16161F, radio 14-16) */
export function ListRow({
  children,
  onPress,
  dashed,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  /** tarjeta punteada de «+ crear» */
  dashed?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const content = (
    <View style={[styles.row, dashed && styles.rowDashed, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

/** Barra de estilo (handoff §8): pista de 6px con punto violeta en el % */
export function StyleBar({ left, right, value }: { left: string; right: string; value: number }) {
  return (
    <View style={styles.axisBlock}>
      <View style={styles.axisLabels}>
        <Text style={styles.axisLabel}>{left}</Text>
        <Text style={styles.axisLabel}>{right}</Text>
      </View>
      <View style={styles.axisTrack}>
        <View style={[styles.axisDot, { left: `${value}%` }]} />
      </View>
    </View>
  );
}

/** Barra de nivel (gamificación v1): título rolero + progreso al siguiente nivel */
export function XpBar({ info }: { info: LevelInfo }) {
  return (
    <View style={styles.axisBlock}>
      <View style={styles.axisLabels}>
        <Text style={styles.xpTitle}>
          Nv. {info.level} · {info.title}
        </Text>
        <Text style={styles.axisLabel}>
          {info.totalXp - info.levelFloor} / {info.nextLevelAt - info.levelFloor} XP
        </Text>
      </View>
      <View style={styles.xpTrack}>
        <LinearGradient
          colors={Rolder.brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.xpFill, { width: `${Math.max(2, Math.round(info.progress * 100))}%` }]}
        />
      </View>
    </View>
  );
}

/** Pill de estado (EN JUEGO / BUSCANDO MESA / COMPLETA…) */
export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'violet' | 'green' | 'gray' | 'gold';
}) {
  const bg =
    tone === 'violet' ? 'rgba(199,125,255,0.25)'
    : tone === 'green' ? Rolder.likeChipBg
    : tone === 'gold' ? 'rgba(232,164,76,0.22)'
    : 'rgba(255,255,255,0.08)';
  const color =
    tone === 'violet' ? Rolder.violetSofter
    : tone === 'green' ? Rolder.likeChipText
    : tone === 'gold' ? Rolder.goldLight
    : 'rgba(255,255,255,0.55)';
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  screenBlurb: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    lineHeight: 18,
  },
  sectionLabel: {
    color: Rolder.violet,
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  primary: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    boxShadow: '0 6px 18px rgba(63,191,143,0.25)',
  },
  primaryLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  outline: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  outlineLabel: {
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  discord: {
    backgroundColor: Rolder.discord,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  row: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowDashed: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: 'rgba(199,125,255,0.5)',
    justifyContent: 'center',
  },
  axisBlock: {
    gap: 5,
  },
  axisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: Rolder.textSecondary,
    fontSize: 11.5,
    fontFamily: RolderFonts.regular,
  },
  axisTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  axisDot: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: Rolder.violet,
  },
  xpTitle: {
    color: '#fff',
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  xpTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 5,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillLabel: {
    fontSize: 10.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
