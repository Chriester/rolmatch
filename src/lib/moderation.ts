import { supabase } from '@/lib/supabase';

export type ReportTarget =
  | { kind: 'user'; id: string }
  | { kind: 'group'; id: string }
  /** un mensaje concreto del chat de una mesa (migr. 00045) */
  | { kind: 'message'; id: string; excerpt: string | null; authorId: string | null };

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
    // de un mensaje se guarda también a quién se está reportando: es lo que
    // permite actuar sobre la persona, no solo sobre la línea de texto
    reported_user_id:
      target.kind === 'user' ? target.id : target.kind === 'message' ? target.authorId : null,
    reported_group_id: target.kind === 'group' ? target.id : null,
    reported_message_id: target.kind === 'message' ? target.id : null,
    // copia, no join: el autor borrará el mensaje y la prueba debe quedar
    message_excerpt: target.kind === 'message' ? target.excerpt?.slice(0, 500) ?? null : null,
    reason,
    details,
  });
  if (error) throw error;
}

export type ReportStatus = 'open' | 'reviewed' | 'actioned';

export type ModerationReport = {
  id: string;
  status: ReportStatus;
  reason: string;
  details: string | null;
  created_at: string;
  reportedUserId: string | null;
  reportedUserAlias: string | null;
  reportedGroupId: string | null;
  reportedGroupName: string | null;
  messageExcerpt: string | null;
};

/** La cola de moderación. La RLS solo la deja leer a los moderadores. */
export async function fetchReports(status: ReportStatus | 'all' = 'open') {
  let query = supabase
    .from('reports')
    .select(
      `id, status, reason, details, created_at, reported_user_id, reported_group_id,
       message_excerpt,
       profiles!reports_reported_user_id_fkey(alias),
       groups!reports_reported_group_id_fkey(name)`
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const person = row.profiles as unknown as { alias: string } | null;
    const group = row.groups as unknown as { name: string } | null;
    return {
      id: row.id as string,
      status: row.status as ReportStatus,
      reason: row.reason as string,
      details: row.details as string | null,
      created_at: row.created_at as string,
      reportedUserId: row.reported_user_id as string | null,
      reportedUserAlias: person?.alias ?? null,
      reportedGroupId: row.reported_group_id as string | null,
      reportedGroupName: group?.name ?? null,
      messageExcerpt: row.message_excerpt as string | null,
    } satisfies ModerationReport;
  });
}

export async function setReportStatus(reportId: string, status: ReportStatus) {
  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
  if (error) throw error;
}

/** ¿Soy moderador? (para enseñar la bandeja en Opciones). */
export async function amIModerator(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_moderator')
      .eq('id', userId)
      .maybeSingle();
    return Boolean(data?.is_moderator);
  } catch {
    return false;
  }
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
