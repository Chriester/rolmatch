// InlineBanner (rediseño de mesas, entregable §5): aviso accionable con sus
// botones DENTRO — nunca modal ni overlay. Ámbar para «¿Seguís jugando?»,
// verde para «Crónica de hoy». Las acciones son opcionales: sin ellas es
// solo un aviso en contexto.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts, RolderRadius } from '@/constants/theme';

export type InlineBannerTone = 'amber' | 'green' | 'violet';

const TONES: Record<InlineBannerTone, { bg: string; border: string; title: string }> = {
  amber: { bg: 'rgba(232,164,76,0.08)', border: 'rgba(232,164,76,0.4)', title: '#E8A44C' },
  green: { bg: 'rgba(63,191,143,0.08)', border: 'rgba(63,191,143,0.4)', title: Rolder.like },
  violet: { bg: 'rgba(199,125,255,0.08)', border: 'rgba(199,125,255,0.4)', title: Rolder.violetSoft },
};

export type InlineBannerAction = {
  label: string;
  onPress: () => void;
  /** true = botón lleno con el color del tono; false = enlace discreto */
  primary?: boolean;
  disabled?: boolean;
};

type InlineBannerProps = {
  tone?: InlineBannerTone;
  title: string;
  body?: string;
  actions?: InlineBannerAction[];
  children?: ReactNode;
};

export function InlineBanner({ tone = 'amber', title, body, actions, children }: InlineBannerProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.title, { color: palette.title }]}>{title}</Text>
      {body !== undefined && <Text style={styles.body}>{body}</Text>}
      {children}
      {actions !== undefined && actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              disabled={action.disabled}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.action,
                action.primary && { backgroundColor: palette.title, borderColor: palette.title },
                !action.primary && { borderColor: palette.border },
                (pressed || action.disabled) && styles.actionPressed,
              ]}>
              <Text
                style={[
                  styles.actionLabel,
                  { color: action.primary ? '#0B0B12' : palette.title },
                ]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: RolderRadius.lg,
    padding: 12,
    gap: 6,
  },
  title: {
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
  },
  body: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: RolderFonts.regular,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  action: {
    minHeight: 34,
    borderRadius: RolderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionLabel: {
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
  },
});
