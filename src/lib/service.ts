// Ficha de servicio: lectura de la vista pública profile_service_stats
// (migr. 00057). Degrada a mapa vacío si la migración no está aplicada.

import { supabase } from '@/lib/supabase';

export type ServiceStats = {
  sessionsPlayed: number;
  groupsCount: number;
  /** % de asistencia según valoraciones de compañeros; null sin valoraciones */
  attendancePct: number | null;
  memberSince: string;
};

export async function fetchServiceStats(userIds: string[]): Promise<Map<string, ServiceStats>> {
  const map = new Map<string, ServiceStats>();
  if (userIds.length === 0) return map;
  try {
    const { data, error } = await supabase
      .from('profile_service_stats')
      .select('user_id, member_since, sessions_played, groups_count, attendance_pct')
      .in('user_id', userIds);
    if (error) throw error;
    for (const row of data ?? []) {
      map.set(row.user_id as string, {
        sessionsPlayed: (row.sessions_played as number) ?? 0,
        groupsCount: (row.groups_count as number) ?? 0,
        attendancePct: (row.attendance_pct as number | null) ?? null,
        memberSince: row.member_since as string,
      });
    }
  } catch {
    // migración 00057 sin aplicar
  }
  return map;
}

/** «jul 2026» — antigüedad compacta para la ficha */
export function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
}
