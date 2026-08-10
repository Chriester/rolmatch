import { supabase } from '@/lib/supabase';

export type ReliabilitySummary = { average: number; count: number };

export async function submitRating(
  raterId: string,
  ratedId: string,
  groupId: string | null,
  reliability: number,
  attended: boolean,
  comment: string | null
) {
  const { error } = await supabase.from('ratings').insert({
    rater_id: raterId,
    rated_id: ratedId,
    group_id: groupId,
    reliability,
    attended,
    comment,
  });
  if (error) throw error;
}

/**
 * A quién he valorado YA en esta mesa desde una fecha (el día de la sesión).
 * Sirve para no pedir dos veces la misma valoración, pero volver a pedirla
 * cuando se juegue otra partida.
 */
export async function fetchRatedSince(
  raterId: string,
  groupId: string,
  sinceIso: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('ratings')
    .select('rated_id')
    .eq('rater_id', raterId)
    .eq('group_id', groupId)
    .gte('created_at', sinceIso);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.rated_id as string));
}

/** Medias de fiabilidad para un conjunto de perfiles (vista agregada pública). */
export async function fetchReliability(
  userIds: string[]
): Promise<Map<string, ReliabilitySummary>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('profile_reliability')
    .select('rated_id, average, ratings_count')
    .in('rated_id', userIds);
  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [
      row.rated_id as string,
      { average: Number(row.average), count: row.ratings_count as number },
    ])
  );
}
