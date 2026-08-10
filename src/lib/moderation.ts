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

/** Deshace un bloqueo propio. La RLS solo deja borrar los que yo puse. */
export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

export type BlockedProfile = {
  id: string;
  alias: string | null;
  avatar_url: string | null;
  created_at: string;
};

/**
 * A quién he bloqueado YO (los bloqueos que puedo deshacer). No incluye a
 * quien me haya bloqueado a mí: eso no es asunto mío ni puedo levantarlo.
 */
export async function fetchMyBlocks(userId: string): Promise<BlockedProfile[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, created_at, profiles!blocks_blocked_id_fkey(alias, avatar_url)')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as {
      alias: string | null;
      avatar_url: string | null;
    } | null;
    return {
      id: row.blocked_id as string,
      alias: profile?.alias ?? null,
      avatar_url: profile?.avatar_url ?? null,
      created_at: row.created_at as string,
    };
  });
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
