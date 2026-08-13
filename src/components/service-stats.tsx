// Ficha de servicio: fila de veteranía (sesiones jugadas, mesas, asistencia,
// antigüedad). Es el activo visible del usuario — se enseña en el perfil
// propio y en el público; la tarjeta del feed lleva su versión de una línea.

import { StyleSheet, Text, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';
import { formatMemberSince, type ServiceStats } from '@/lib/service';

export function ServiceStatsRow({ stats }: { stats: ServiceStats }) {
  const tiles: { value: string; label: string }[] = [
    { value: `🎲 ${stats.sessionsPlayed}`, label: stats.sessionsPlayed === 1 ? 'sesión' : 'sesiones' },
    { value: `🛡 ${stats.groupsCount}`, label: stats.groupsCount === 1 ? 'mesa' : 'mesas' },
  ];
  if (stats.attendancePct !== null) {
    tiles.push({ value: `✋ ${stats.attendancePct}%`, label: 'asistencia' });
  }
  tiles.push({ value: `📅 ${formatMemberSince(stats.memberSince)}`, label: 'en la posada' });

  return (
    <View style={styles.row}>
      {tiles.map((tile) => (
        <View key={tile.label} style={styles.tile}>
          <Text style={styles.value} numberOfLines={1}>
            {tile.value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {tile.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Línea compacta para la tarjeta del feed, o null sin sesiones que presumir. */
export function serviceCardLine(stats: ServiceStats | null): string | null {
  if (!stats || stats.sessionsPlayed === 0) return null;
  const sessions = `🎖 ${stats.sessionsPlayed} ${
    stats.sessionsPlayed === 1 ? 'sesión jugada' : 'sesiones jugadas'
  }`;
  return stats.attendancePct !== null
    ? `${sessions} · ✋ ${stats.attendancePct}% asistencia`
    : sessions;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  value: {
    color: '#fff',
    fontSize: 14.5,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  label: {
    color: Rolder.textTertiary,
    fontSize: 10.5,
    fontFamily: RolderFonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
