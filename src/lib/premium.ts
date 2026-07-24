// Premium (docs/monetizacion.md): estado, boost de mesa y likes recibidos.
// Los entitlements los escribe solo el sistema; aquí solo se leen y se
// ejercen las features.

import { supabase } from '@/lib/supabase';

export type PremiumStatus = { active: boolean; until: string | null };

export async function fetchPremiumStatus(userId: string): Promise<PremiumStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('premium_until')
    .eq('id', userId)
    .single();
  if (error) throw error;
  const until = data?.premium_until as string | null;
  return { active: until !== null && new Date(until).getTime() > Date.now(), until };
}

/** ¿Sigue activo un boost? (fuera de componentes: Date.now no es puro en render) */
export function isBoostActive(until: string | null): boolean {
  return until !== null && new Date(until).getTime() > Date.now();
}

const BOOST_DAYS = 7;

/** Destaca la mesa 7 días (el trigger de la DB valida dueño + premium). */
export async function boostGroup(groupId: string): Promise<string> {
  const boostedUntil = new Date(Date.now() + BOOST_DAYS * 24 * 3600_000).toISOString();
  const { error } = await supabase
    .from('groups')
    .update({ boosted_until: boostedUntil })
    .eq('id', groupId);
  if (error) throw error;
  return boostedUntil;
}

// ---- Likes recibidos (Tinder Gold) ----

export type ReceivedLike =
  | { kind: 'group'; id: string; name: string; imageUrl: string | null; matched: boolean }
  | {
      kind: 'player';
      id: string;
      alias: string;
      imageUrl: string | null;
      groupName: string;
      matched: boolean;
    };

export async function fetchReceivedLikes(userId: string): Promise<ReceivedLike[]> {
  const [{ data: groupLikes }, { data: myGroups }, { data: myMatches }] = await Promise.all([
    // Mesas que me han dado like a mí
    supabase
      .from('swipes')
      .select('group_id, created_at, groups(name, image_url)')
      .eq('user_id', userId)
      .eq('origin', 'group')
      .eq('direction', 'like')
      .order('created_at', { ascending: false }),
    supabase.from('groups').select('id, name').eq('owner_id', userId),
    supabase.from('matches').select('user_id, group_id'),
  ]);

  const matchedPairs = new Set((myMatches ?? []).map((m) => `${m.user_id}:${m.group_id}`));
  const likes: ReceivedLike[] = [];

  for (const like of groupLikes ?? []) {
    const group = like.groups as unknown as { name: string; image_url: string | null } | null;
    likes.push({
      kind: 'group',
      id: like.group_id,
      name: group?.name ?? 'Mesa',
      imageUrl: group?.image_url ?? null,
      matched: matchedPairs.has(`${userId}:${like.group_id}`),
    });
  }

  const groupIds = (myGroups ?? []).map((g) => g.id);
  if (groupIds.length > 0) {
    const groupNames = new Map((myGroups ?? []).map((g) => [g.id, g.name as string]));
    const { data: playerLikes } = await supabase
      .from('swipes')
      .select('user_id, group_id, created_at, profiles(alias, avatar_url)')
      .in('group_id', groupIds)
      .eq('origin', 'user')
      .eq('direction', 'like')
      .order('created_at', { ascending: false });
    for (const like of playerLikes ?? []) {
      const profile = like.profiles as unknown as {
        alias: string;
        avatar_url: string | null;
      } | null;
      likes.push({
        kind: 'player',
        id: like.user_id,
        alias: profile?.alias ?? 'Jugador/a',
        imageUrl: profile?.avatar_url ?? null,
        groupName: groupNames.get(like.group_id) ?? 'tu mesa',
        matched: matchedPairs.has(`${like.user_id}:${like.group_id}`),
      });
    }
  }

  return likes;
}
