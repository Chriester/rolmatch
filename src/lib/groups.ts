import { supabase } from '@/lib/supabase';
import type { ExperienceLevel, VttType } from '@/lib/profile';

export type GroupFormat = 'campaign' | 'oneshot';
export type MemberRole = 'gm' | 'player';

export type GroupInput = {
  name: string;
  image_url: string | null;
  system_id: number | null;
  format: GroupFormat;
  description: string | null;
  timezone: string;
  session_weekday: number | null;
  session_slot: number | null;
  frequency: string | null;
  experience_wanted: ExperienceLevel | null;
  style_combat_narrative: number;
  style_serious_humor: number;
  style_roleplay_weight: number;
  vtt: VttType;
  discord_invite_url: string | null;
};

export type GroupSummary = {
  id: string;
  name: string;
  image_url: string | null;
  format: GroupFormat;
  is_active: boolean;
  systems: { name: string } | null;
};

export type GroupDetail = {
  id: string;
  owner_id: string;
  name: string;
  image_url: string | null;
  boosted_until: string | null;
  system_id: number | null;
  format: GroupFormat;
  description: string | null;
  timezone: string;
  session_weekday: number | null;
  session_slot: number | null;
  frequency: string | null;
  experience_wanted: ExperienceLevel | null;
  style_combat_narrative: number;
  style_serious_humor: number;
  style_roleplay_weight: number;
  vtt: VttType;
  discord_invite_url: string | null;
  is_active: boolean;
  systems: { name: string } | null;
  group_members: {
    user_id: string;
    member_role: MemberRole;
    profiles: { alias: string; avatar_url: string | null } | null;
  }[];
  max_players: number;
};

/** Plazas libres DERIVADAS: límite menos miembros (sin contar al GM). */
export function freeSeats(
  group: Pick<GroupDetail, 'max_players' | 'owner_id' | 'group_members'>
): number {
  const players = group.group_members.filter((m) => m.user_id !== group.owner_id).length;
  return Math.max(0, group.max_players - players);
}

/** Crea la mesa con su límite de jugadores y añade al creador como GM. */
export async function createGroup(ownerId: string, group: GroupInput, maxPlayers: number) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ ...group, owner_id: ownerId, max_players: maxPlayers })
    .select('id')
    .single();
  if (error) throw error;
  const groupId = data.id as string;

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: ownerId, member_role: 'gm' });
  if (memberError) throw memberError;

  return groupId;
}

/** Actualiza los datos de la mesa y su límite de jugadores (solo el dueño, por RLS). */
export async function updateGroup(groupId: string, group: GroupInput, maxPlayers: number) {
  const { error } = await supabase
    .from('groups')
    .update({ ...group, max_players: maxPlayers })
    .eq('id', groupId);
  if (error) throw error;
}

/**
 * Disuelve la mesa (solo el dueño — RLS). La cascada arrastra miembros,
 * chat, sesiones, votaciones, histórico y matches.
 */
export async function deleteGroup(groupId: string) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}

/**
 * Traspasa la mesa a otro miembro (migr. 00051): el nuevo pasa a GM y el
 * actual se queda de jugador. Solo el dueño (lo valida el RPC).
 */
export async function transferGroup(groupId: string, newOwnerId: string) {
  const { error } = await supabase.rpc('transfer_group', {
    p_group_id: groupId,
    p_new_owner: newOwnerId,
  });
  if (error) throw error;
}

/** Mesas de las que soy dueño y cuánta gente hay dentro (sin contarme). */
export type OwnedGroup = { id: string; name: string; members: number };

export async function fetchMyOwnedGroups(userId: string): Promise<OwnedGroup[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, group_members(user_id)')
    .eq('owner_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    members: ((row.group_members as { user_id: string }[]) ?? []).filter(
      (m) => m.user_id !== userId
    ).length,
  }));
}

/** Saca a un miembro de la mesa (uno mismo, o el dueño a cualquiera — RLS). */
export async function removeGroupMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchMyGroups(userId: string): Promise<GroupSummary[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, image_url, format, is_active, systems(name), group_members!inner(user_id)')
    .eq('group_members.user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GroupSummary[];
}

export async function fetchGroup(groupId: string): Promise<GroupDetail> {
  const { data, error } = await supabase
    .from('groups')
    .select(
      `id, owner_id, name, image_url, boosted_until, format, description, timezone, system_id, session_weekday, session_slot,
       frequency, experience_wanted, style_combat_narrative, style_serious_humor,
       style_roleplay_weight, vtt, discord_invite_url, is_active,
       max_players,
       systems(name),
       group_members(user_id, member_role, profiles(alias, avatar_url))`
    )
    .eq('id', groupId)
    .single();
  if (error) throw error;
  return data as unknown as GroupDetail;
}

/** Lo que ve alguien SIN cuenta que llega por un enlace de invitación. */
export type PublicGroupCard = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  format: GroupFormat;
  frequency: string | null;
  session_weekday: number | null;
  session_slot: number | null;
  timezone: string;
  system_name: string | null;
  max_players: number;
  taken_seats: number;
  owner_alias: string | null;
  owner_avatar_url: string | null;
};

/**
 * Ficha mínima de una mesa activa, sin sesión (migr. 00046). null si no
 * existe o está disuelta.
 */
export async function fetchPublicGroupCard(groupId: string): Promise<PublicGroupCard | null> {
  const { data, error } = await supabase.rpc('public_group_card', { p_group_id: groupId });
  if (error) throw error;
  const rows = (data ?? []) as PublicGroupCard[];
  return rows[0] ?? null;
}

export const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const SLOT_LABELS = ['Mañana', 'Tarde', 'Noche', 'Madrugada'];
// Franjas de 6 h alineadas con el algoritmo de matching (src/lib/matching.ts)
export const SLOT_HOURS = ['08–14 h', '14–20 h', '20–02 h', '02–08 h'];
export const VTT_LABELS: Record<VttType, string> = {
  discord_only: 'Solo Discord',
  roll20: 'Roll20',
  foundry: 'Foundry VTT',
  other: 'Otro',
};
export const FORMAT_LABELS: Record<GroupFormat, string> = {
  campaign: 'Campaña',
  oneshot: 'One-shot',
};
export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  none: 'Sin experiencia',
  beginner: 'Novato',
  intermediate: 'Intermedio',
  veteran: 'Veterano',
};
