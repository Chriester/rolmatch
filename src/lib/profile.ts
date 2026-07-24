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
  style_combat_narrative: number;
  style_serious_humor: number;
  style_roleplay_weight: number;
  voice_chat: boolean;
  camera_ok: boolean;
  preferred_vtt: VttType;
  open_to_any_system: boolean;
};

export type UserSystemInput = { system_id: number; experience: ExperienceLevel };

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
