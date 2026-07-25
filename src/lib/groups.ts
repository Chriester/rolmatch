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
  group_openings: { id: string; seats: number; requirements: string | null; is_open: boolean }[];
};

/** Crea la mesa, su hueco de plazas y añade al creador como miembro GM. */
export async function createGroup(ownerId: string, group: GroupInput, seats: number) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ ...group, owner_id: ownerId })
    .select('id')
    .single();
  if (error) throw error;
  const groupId = data.id as string;

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: ownerId, member_role: 'gm' });
  if (memberError) throw memberError;

  if (seats > 0) {
    const { error: openingError } = await supabase
      .from('group_openings')
      .insert({ group_id: groupId, seats });
    if (openingError) throw openingError;
  }

  return groupId;
}

/** Actualiza los datos de la mesa y sus plazas libres (solo el dueño, por RLS). */
export async function updateGroup(groupId: string, group: GroupInput, seats: number) {
  const { error } = await supabase.from('groups').update(group).eq('id', groupId);
  if (error) throw error;

  const { data: openings, error: openingsError } = await supabase
    .from('group_openings')
    .select('id')
    .eq('group_id', groupId)
    .limit(1);
  if (openingsError) throw openingsError;

  if (openings && openings.length > 0) {
    const { error: updError } = await supabase
      .from('group_openings')
      .update({ seats: Math.max(seats, 1), is_open: seats > 0 })
      .eq('id', openings[0].id);
    if (updError) throw updError;
  } else if (seats > 0) {
    const { error: insError } = await supabase
      .from('group_openings')
      .insert({ group_id: groupId, seats });
    if (insError) throw insError;
  }
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
       systems(name),
       group_members(user_id, member_role, profiles(alias, avatar_url)),
       group_openings(id, seats, requirements, is_open)`
    )
    .eq('id', groupId)
    .single();
  if (error) throw error;
  return data as unknown as GroupDetail;
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
