import { matchPlayerToGroup, type MatchGroup, type MatchPlayer, type MatchResult } from '@/lib/matching';
import { fetchBlockRelations } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import type { GroupFormat } from '@/lib/groups';
import type { VttType } from '@/lib/profile';

export type GroupCandidate = {
  group: MatchGroup & {
    id: string;
    owner_id: string;
    name: string;
    description: string | null;
    format: GroupFormat;
    frequency: string | null;
    systems: { name: string } | null;
  };
  result: MatchResult;
};

export type ShowcaseCharacter = {
  name: string;
  archetype: string | null;
  status: string;
  systems: { name: string } | null;
};

export type PlayerCandidate = {
  player: MatchPlayer & {
    id: string;
    alias: string;
    role: string;
    characters: ShowcaseCharacter[];
  };
  result: MatchResult;
};

async function fetchMatchPlayer(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `id, alias, role, timezone, languages, open_to_any_system, bio, avatar_url,
       style_combat_narrative, style_serious_humor, style_roleplay_weight, preferred_vtt,
       availability_slots(weekday, slot), user_systems(system_id, experience)`
    )
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

function toMatchPlayer(row: Awaited<ReturnType<typeof fetchMatchPlayer>>): MatchPlayer {
  return {
    timezone: row.timezone,
    languages: row.languages,
    open_to_any_system: row.open_to_any_system,
    style_combat_narrative: row.style_combat_narrative,
    style_serious_humor: row.style_serious_humor,
    style_roleplay_weight: row.style_roleplay_weight,
    preferred_vtt: row.preferred_vtt as VttType,
    bio: row.bio,
    avatar_url: row.avatar_url,
    availability: row.availability_slots,
    systems: row.user_systems,
  };
}

/** Mesas activas con plazas que pasan los filtros duros para este jugador, ordenadas por score. */
export async function fetchPlayerFeed(userId: string): Promise<GroupCandidate[]> {
  const me = toMatchPlayer(await fetchMatchPlayer(userId));

  const [{ data: myMemberships }, { data: mySwipes }, blocked] = await Promise.all([
    supabase.from('group_members').select('group_id').eq('user_id', userId),
    supabase.from('swipes').select('group_id').eq('user_id', userId).eq('origin', 'user'),
    fetchBlockRelations(userId),
  ]);
  const excluded = new Set([
    ...(myMemberships ?? []).map((m) => m.group_id),
    ...(mySwipes ?? []).map((s) => s.group_id),
  ]);

  const { data: groups, error } = await supabase
    .from('groups')
    .select(
      `id, owner_id, name, description, format, frequency, timezone, language, system_id,
       session_weekday, session_slot, experience_wanted, vtt,
       style_combat_narrative, style_serious_humor, style_roleplay_weight,
       systems(name), group_openings!inner(is_open)`
    )
    .eq('is_active', true)
    .eq('group_openings.is_open', true);
  if (error) throw error;

  return (groups ?? [])
    .filter((g) => !excluded.has(g.id) && !blocked.has(g.owner_id))
    .map((g) => ({
      group: g as unknown as GroupCandidate['group'],
      result: matchPlayerToGroup(me, g as unknown as MatchGroup),
    }))
    .filter((c) => c.result.pass)
    .sort((a, b) => b.result.score - a.result.score);
}

/** Candidatos con perfil completo que pasan los filtros duros para esta mesa, ordenados por score. */
export async function fetchGroupCandidates(
  groupId: string,
  viewerId: string
): Promise<PlayerCandidate[]> {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select(
      `id, timezone, language, system_id, session_weekday, session_slot, experience_wanted,
       style_combat_narrative, style_serious_humor, style_roleplay_weight, vtt`
    )
    .eq('id', groupId)
    .single();
  if (groupError) throw groupError;

  const [{ data: members }, { data: groupSwipes }, blocked] = await Promise.all([
    supabase.from('group_members').select('user_id').eq('group_id', groupId),
    supabase.from('swipes').select('user_id').eq('group_id', groupId).eq('origin', 'group'),
    fetchBlockRelations(viewerId),
  ]);
  const excluded = new Set([
    ...(members ?? []).map((m) => m.user_id),
    ...(groupSwipes ?? []).map((s) => s.user_id),
    ...blocked,
  ]);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      `id, alias, role, timezone, languages, open_to_any_system, bio, avatar_url,
       style_combat_narrative, style_serious_humor, style_roleplay_weight, preferred_vtt,
       availability_slots(weekday, slot), user_systems(system_id, experience),
       characters(name, archetype, status, systems(name))`
    );
  if (error) throw error;

  return (profiles ?? [])
    .filter((p) => !excluded.has(p.id) && p.availability_slots.length > 0)
    .map((p) => ({
      player: {
        ...toMatchPlayer(p),
        id: p.id,
        alias: p.alias,
        role: p.role,
        characters: (p.characters ?? []) as unknown as ShowcaseCharacter[],
      },
      result: matchPlayerToGroup(toMatchPlayer(p), group as unknown as MatchGroup),
    }))
    .filter((c) => c.result.pass)
    .sort((a, b) => b.result.score - a.result.score);
}
