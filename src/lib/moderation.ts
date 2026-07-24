import { supabase } from '@/lib/supabase';

export type ReportTarget =
  | { kind: 'user'; id: string }
  | { kind: 'group'; id: string };

export const REPORT_REASONS = [
  'Comportamiento tóxico',
  'Spam o publicidad',
  'Perfil falso',
  'Contenido inapropiado',
  'Otro',
] as const;

export async function submitReport(
  reporterId: string,
  target: ReportTarget,
  reason: string,
  details: string | null
) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    reported_user_id: target.kind === 'user' ? target.id : null,
    reported_group_id: target.kind === 'group' ? target.id : null,
    reason,
    details,
  });
  if (error) throw error;
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  // Ya bloqueado: lo tratamos como éxito
  if (error && error.code !== '23505') throw error;
}

/**
 * Ids de usuarios con los que hay bloqueo en cualquier dirección.
 * Los feeds excluyen a estos usuarios y a sus mesas.
 */
export async function fetchBlockRelations(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (error) throw error;
  const others = new Set<string>();
  for (const row of data ?? []) {
    others.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id);
  }
  return others;
}
