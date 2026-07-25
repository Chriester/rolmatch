import { supabase } from '@/lib/supabase';

export type MyMatch = {
  id: string;
  matched_at: string;
  discord_channel_id: string | null;
  side: 'player' | 'gm';
  /** Nombre a mostrar: la mesa (si soy jugador) o el jugador (si soy GM) */
  counterpart: string;
  groupName: string;
  /** imagen de la contraparte (foto de mesa o avatar del jugador) */
  imageUrl: string | null;
  /** destino al tocar la fila: perfil de la mesa (jugador) o del jugador (GM) */
  targetGroupId: string | null;
  targetUserId: string | null;
};

/** URL del canal del match en el servidor comunitario, si el bot ya lo creó. */
export function matchChannelUrl(match: { discord_channel_id: string | null }): string | null {
  const guildId = process.env.EXPO_PUBLIC_DISCORD_GUILD_ID;
  if (!match.discord_channel_id || !guildId) return null;
  return `https://discord.com/channels/${guildId}/${match.discord_channel_id}`;
}

export async function fetchMyMatches(userId: string): Promise<MyMatch[]> {
  const [asPlayer, asGm] = await Promise.all([
    supabase
      .from('matches')
      .select('id, matched_at, discord_channel_id, group_id, groups(name, image_url)')
      .eq('user_id', userId)
      .order('matched_at', { ascending: false }),
    supabase
      .from('matches')
      .select(
        'id, matched_at, discord_channel_id, user_id, profiles(alias, avatar_url), groups!inner(name, owner_id)'
      )
      .eq('groups.owner_id', userId)
      .neq('user_id', userId)
      .order('matched_at', { ascending: false }),
  ]);
  if (asPlayer.error) throw asPlayer.error;
  if (asGm.error) throw asGm.error;

  type Row = { id: string; matched_at: string; discord_channel_id: string | null };
  const playerMatches: MyMatch[] = (asPlayer.data ?? []).map((m) => {
    const row = m as unknown as Row & {
      group_id: string;
      groups: { name: string; image_url: string | null } | null;
    };
    return {
      id: row.id,
      matched_at: row.matched_at,
      discord_channel_id: row.discord_channel_id,
      side: 'player',
      counterpart: row.groups?.name ?? 'Mesa',
      groupName: row.groups?.name ?? 'Mesa',
      imageUrl: row.groups?.image_url ?? null,
      targetGroupId: row.group_id,
      targetUserId: null,
    };
  });
  const gmMatches: MyMatch[] = (asGm.data ?? []).map((m) => {
    const row = m as unknown as Row & {
      user_id: string;
      profiles: { alias: string; avatar_url: string | null } | null;
      groups: { name: string } | null;
    };
    return {
      id: row.id,
      matched_at: row.matched_at,
      discord_channel_id: row.discord_channel_id,
      side: 'gm',
      counterpart: row.profiles?.alias ?? 'Jugador/a',
      groupName: row.groups?.name ?? 'Mesa',
      imageUrl: row.profiles?.avatar_url ?? null,
      targetGroupId: null,
      targetUserId: row.user_id,
    };
  });

  return [...playerMatches, ...gmMatches].sort((a, b) =>
    b.matched_at.localeCompare(a.matched_at)
  );
}

export type GroupMatch = {
  id: string;
  matched_at: string;
  discord_channel_id: string | null;
  user_id: string;
  alias: string;
  avatar_url: string | null;
};

/** Jugadores con los que esta mesa ha hecho match (solo el dueño puede verlos, por RLS). */
export async function fetchGroupMatches(groupId: string): Promise<GroupMatch[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, matched_at, discord_channel_id, user_id, profiles(alias, avatar_url)')
    .eq('group_id', groupId)
    .order('matched_at', { ascending: false });
  if (error) throw error;

  type Row = {
    id: string;
    matched_at: string;
    discord_channel_id: string | null;
    user_id: string;
    profiles: { alias: string; avatar_url: string | null } | null;
  };
  return (data ?? []).map((row) => {
    const r = row as unknown as Row;
    return {
      id: r.id,
      matched_at: r.matched_at,
      discord_channel_id: r.discord_channel_id,
      user_id: r.user_id,
      alias: r.profiles?.alias ?? 'Jugador/a',
      avatar_url: r.profiles?.avatar_url ?? null,
    };
  });
}
