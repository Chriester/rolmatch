import { supabase } from '@/lib/supabase';

export type MyMatch = {
  id: string;
  matched_at: string;
  discord_channel_id: string | null;
  side: 'player' | 'gm';
  /** Nombre a mostrar: la mesa (si soy jugador) o el jugador (si soy GM) */
  counterpart: string;
  groupName: string;
};

/** URL del canal del match en el servidor comunitario, si el bot ya lo creó. */
export function matchChannelUrl(match: MyMatch): string | null {
  const guildId = process.env.EXPO_PUBLIC_DISCORD_GUILD_ID;
  if (!match.discord_channel_id || !guildId) return null;
  return `https://discord.com/channels/${guildId}/${match.discord_channel_id}`;
}

export async function fetchMyMatches(userId: string): Promise<MyMatch[]> {
  const [asPlayer, asGm] = await Promise.all([
    supabase
      .from('matches')
      .select('id, matched_at, discord_channel_id, groups(name)')
      .eq('user_id', userId)
      .order('matched_at', { ascending: false }),
    supabase
      .from('matches')
      .select('id, matched_at, discord_channel_id, profiles(alias), groups!inner(name, owner_id)')
      .eq('groups.owner_id', userId)
      .neq('user_id', userId)
      .order('matched_at', { ascending: false }),
  ]);
  if (asPlayer.error) throw asPlayer.error;
  if (asGm.error) throw asGm.error;

  type Row = { id: string; matched_at: string; discord_channel_id: string | null };
  const playerMatches: MyMatch[] = (asPlayer.data ?? []).map((m) => {
    const row = m as unknown as Row & { groups: { name: string } | null };
    return {
      id: row.id,
      matched_at: row.matched_at,
      discord_channel_id: row.discord_channel_id,
      side: 'player',
      counterpart: row.groups?.name ?? 'Mesa',
      groupName: row.groups?.name ?? 'Mesa',
    };
  });
  const gmMatches: MyMatch[] = (asGm.data ?? []).map((m) => {
    const row = m as unknown as Row & {
      profiles: { alias: string } | null;
      groups: { name: string } | null;
    };
    return {
      id: row.id,
      matched_at: row.matched_at,
      discord_channel_id: row.discord_channel_id,
      side: 'gm',
      counterpart: row.profiles?.alias ?? 'Jugador/a',
      groupName: row.groups?.name ?? 'Mesa',
    };
  });

  return [...playerMatches, ...gmMatches].sort((a, b) =>
    b.matched_at.localeCompare(a.matched_at)
  );
}
