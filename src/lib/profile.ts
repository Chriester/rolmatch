import { supabase } from '@/lib/supabase';

export type UserRole = 'player' | 'gm' | 'both';
export type ExperienceLevel = 'none' | 'beginner' | 'intermediate' | 'veteran';
export type VttType = 'roll20' | 'foundry' | 'discord_only' | 'other';

export type System = { id: number; slug: string; name: string };

export type AvailabilityCell = { weekday: number; slot: number };

export type ProfileUpdate = {
  alias: string;
  bio: string | null;
  timezone: string;
  role: UserRole;
  avatar_url: string | null;
  style_combat_narrative: number;
  style_serious_humor: number;
  style_roleplay_weight: number;
  voice_chat: boolean;
  camera_ok: boolean;
  preferred_vtt: VttType;
  open_to_any_system: boolean;
};

export type UserSystemInput = { system_id: number; experience: ExperienceLevel };

export type ProfileData = ProfileUpdate & {
  availability: AvailabilityCell[];
  systems: UserSystemInput[];
};

/** Perfil completo con disponibilidad y sistemas, para precargar el editor. */
export async function fetchProfileData(userId: string): Promise<ProfileData> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `alias, bio, timezone, role, avatar_url, open_to_any_system,
       style_combat_narrative, style_serious_humor, style_roleplay_weight,
       voice_chat, camera_ok, preferred_vtt,
       availability_slots(weekday, slot), user_systems(system_id, experience)`
    )
    .eq('id', userId)
    .single();
  if (error) throw error;
  return {
    alias: data.alias,
    bio: data.bio,
    timezone: data.timezone,
    role: data.role as UserRole,
    avatar_url: data.avatar_url,
    open_to_any_system: data.open_to_any_system,
    style_combat_narrative: data.style_combat_narrative,
    style_serious_humor: data.style_serious_humor,
    style_roleplay_weight: data.style_roleplay_weight,
    voice_chat: data.voice_chat,
    camera_ok: data.camera_ok,
    preferred_vtt: data.preferred_vtt as VttType,
    availability: data.availability_slots,
    systems: data.user_systems as UserSystemInput[],
  };
}

export async function fetchProfileAlias(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('alias')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data?.alias ?? null;
}

export async function fetchSystems(): Promise<System[]> {
  const { data, error } = await supabase.from('systems').select('id, slug, name').order('id');
  if (error) throw error;
  return data ?? [];
}

/**
 * El perfil se considera completo cuando tiene al menos una franja de
 * disponibilidad — es el filtro duro nº 1 del matching (§7 del PRD), así que
 * sin ella el usuario no puede aparecer en ningún feed.
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('availability_slots')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function saveOnboarding(
  userId: string,
  profile: ProfileUpdate,
  availability: AvailabilityCell[],
  systems: UserSystemInput[]
) {
  const { error: profileError } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', userId);
  if (profileError) throw profileError;

  const { error: clearSlotsError } = await supabase
    .from('availability_slots')
    .delete()
    .eq('user_id', userId);
  if (clearSlotsError) throw clearSlotsError;

  if (availability.length > 0) {
    const { error } = await supabase
      .from('availability_slots')
      .insert(availability.map((cell) => ({ ...cell, user_id: userId })));
    if (error) throw error;
  }

  const { error: clearSystemsError } = await supabase
    .from('user_systems')
    .delete()
    .eq('user_id', userId);
  if (clearSystemsError) throw clearSystemsError;

  if (systems.length > 0) {
    const { error } = await supabase
      .from('user_systems')
      .insert(systems.map((s) => ({ ...s, user_id: userId })));
    if (error) throw error;
  }
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Madrid';
  } catch {
    return 'Europe/Madrid';
  }
}
