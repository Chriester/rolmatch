// TableTabs (rediseño de mesas, entregable §1): la mesa como hub. Mesa ·
// Chat · Agenda · Diario dejan de ser pantallas sueltas y se navegan como
// pestañas — un salto menos en cada ida y vuelta. Sustituye a los cuatro
// accesos circulares sin etiqueta.
//
// Implementación deliberada: las pestañas SON las rutas de siempre
// (/groups/[id], /chat, /schedule, /journal) vestidas de segmented control
// y navegadas con replace — así los push y deep links existentes siguen
// funcionando y el botón de atrás sale del hub entero, no deshace pestañas.
//
// Variante bloqueada (visitante): 🔒 en las tres privadas; se enseñan en
// vez de ocultarse porque el candado vende — ves qué ganas al entrar.

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';

export type TableTabKey = 'mesa' | 'chat' | 'agenda' | 'diario';

const TABS: { key: TableTabKey; label: string; path: string }[] = [
  { key: 'mesa', label: 'Mesa', path: '' },
  { key: 'chat', label: 'Chat', path: '/chat' },
  { key: 'agenda', label: 'Agenda', path: '/schedule' },
  { key: 'diario', label: 'Diario', path: '/journal' },
];

type TableTabsProps = {
  groupId: string;
  active: TableTabKey;
  /** no leídos del chat: badge numérico (solo si > 0) */
  unread?: number;
  /** visitante sin plaza: solo Mesa es navegable, el resto con candado */
  locked?: boolean;
};

export function TableTabs({ groupId, active, unread = 0, locked = false }: TableTabsProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const isLocked = locked && tab.key !== 'mesa';
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            aria-selected={isActive}
            accessibilityLabel={isLocked ? `${tab.label}, se desbloquea al entrar` : tab.label}
            disabled={isActive || isLocked}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() =>
              router.replace({ pathname: `/groups/[id]${tab.path}` as never, params: { id: groupId } })
            }>
            <Text
              style={[styles.label, isActive && styles.labelActive, isLocked && styles.labelLocked]}
              numberOfLines={1}>
              {tab.label}
              {isLocked ? ' 🔒' : ''}
            </Text>
            {tab.key === 'chat' && unread > 0 && !isLocked && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99' : unread}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 38,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(139,108,255,0.22)',
  },
  tabPressed: {
    opacity: 0.7,
  },
  label: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
  },
  labelLocked: {
    color: Rolder.textTertiary,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Rolder.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '800',
  },
});
