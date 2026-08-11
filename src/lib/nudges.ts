// «Dar un toque» (migr. 00054): un INSERT y el trigger lo convierte en push
// dirigido (via app_push_webhook → push-notify). La constraint unique de la
// tabla es el anti-spam: un toque por persona y asunto, dé quien lo dé.

import { supabase } from '@/lib/supabase';

export type NudgeKind = 'confirm' | 'vote';

export async function sendNudge(
  groupId: string,
  kind: NudgeKind,
  refId: string,
  toUser: string,
  fromUser: string
): Promise<void> {
  const { error } = await supabase.from('nudges').insert({
    group_id: groupId,
    kind,
    ref_id: refId,
    to_user: toUser,
    from_user: fromUser,
  });
  // 23505 = ya avisado por otra persona: para la UI es lo mismo que éxito
  if (error && error.code !== '23505') throw error;
}

/** Quién tiene ya un toque por asunto, para pintar «avisado» y no repetir. */
export async function fetchNudged(
  kind: NudgeKind,
  refIds: string[]
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (refIds.length === 0) return map;
  try {
    const { data, error } = await supabase
      .from('nudges')
      .select('ref_id, to_user')
      .eq('kind', kind)
      .in('ref_id', refIds);
    if (error) throw error;
    for (const row of data ?? []) {
      const set = map.get(row.ref_id) ?? new Set<string>();
      set.add(row.to_user);
      map.set(row.ref_id, set);
    }
  } catch {
    // migración 00054 sin aplicar: sin estado «avisado», y el envío fallará
    // con su propio mensaje — nada que romper aquí
  }
  return map;
}
