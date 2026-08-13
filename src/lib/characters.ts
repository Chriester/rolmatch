import { hasColumn, supabase } from '@/lib/supabase';
import type { Gender } from '@/lib/profile';

export type CharacterStatus = 'looking' | 'playing' | 'retired' | 'fallen';

export const CHARACTER_STATUS_LABELS: Record<CharacterStatus, string> = {
  looking: 'Buscando mesa',
  playing: 'En juego',
  retired: 'Retirado / galería',
  fallen: 'Caído en combate',
};

export type Character = {
  id: string;
  user_id: string;
  is_public: boolean;
  name: string;
  system_id: number | null;
  archetype: string | null;
  level: string | null;
  gender: Gender | null;
  age: string | null;
  concept: string | null;
  backstory: string | null;
  status: CharacterStatus;
  portrait_url: string | null;
  traits: Record<string, string>;
  sheet_theme: string | null;
  systems: { name: string; slug: string } | null;
  /** vida del personaje (migr. 00059); valores por defecto sin la migración */
  playing_group_id: string | null;
  sessions_lived: number;
};

export type CharacterInput = {
  name: string;
  is_public: boolean;
  portrait_url: string | null;
  system_id: number | null;
  archetype: string | null;
  level: string | null;
  gender: Gender | null;
  age: string | null;
  concept: string | null;
  backstory: string | null;
  status: CharacterStatus;
  traits: Record<string, string>;
  sheet_theme: string | null;
  /** mesa donde juega (solo con status 'playing'); se ignora sin la 00059 */
  playing_group_id: string | null;
};

/** "234" → "234 años"; texto libre ("joven eterno") se muestra tal cual. */
export function characterAgeLabel(age: string | null): string | null {
  if (!age) return null;
  const trimmed = age.trim();
  return /^\d+$/.test(trimmed) ? `${trimmed} años` : trimmed;
}

const CHARACTER_FIELDS = `id, user_id, name, is_public, system_id, archetype, level, gender, age, concept,
  backstory, status, portrait_url, traits, sheet_theme, systems(name, slug)`;

/** Columnas de la 00059 solo si la migración está aplicada. */
async function characterFields(): Promise<string> {
  return (await hasColumn('characters', 'sessions_lived'))
    ? `${CHARACTER_FIELDS}, playing_group_id, sessions_lived`
    : CHARACTER_FIELDS;
}

function withLifeDefaults(row: unknown): Character {
  const c = row as Character;
  return { ...c, playing_group_id: c.playing_group_id ?? null, sessions_lived: c.sessions_lived ?? 0 };
}

/** Sin la 00059, el payload no puede llevar playing_group_id (PGRST204). */
async function characterPayload(input: CharacterInput): Promise<Record<string, unknown>> {
  if (await hasColumn('characters', 'sessions_lived')) return input;
  const { playing_group_id: _omitted, ...rest } = input;
  return rest;
}

export async function fetchMyCharacters(userId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select(await characterFields())
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map(withLifeDefaults);
}

export async function fetchCharacter(id: string): Promise<Character> {
  const { data, error } = await supabase
    .from('characters')
    .select(await characterFields())
    .eq('id', id)
    .single();
  if (error) throw error;
  return withLifeDefaults(data);
}

export async function createCharacter(userId: string, input: CharacterInput): Promise<string> {
  const { data, error } = await supabase
    .from('characters')
    .insert({ ...(await characterPayload(input)), user_id: userId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateCharacter(id: string, input: CharacterInput) {
  const { error } = await supabase
    .from('characters')
    .update(await characterPayload(input))
    .eq('id', id);
  if (error) throw error;
}

/** Hito de veteranía del personaje, o null antes de la primera meta. */
export function characterMilestone(sessionsLived: number): string | null {
  if (sessionsLived >= 50) return 'Leyenda: 50 sesiones';
  if (sessionsLived >= 25) return 'Veteranía: 25 sesiones';
  if (sessionsLived >= 10) return 'Curtido: 10 sesiones';
  if (sessionsLived >= 5) return 'Rodado: 5 sesiones';
  return null;
}

export async function deleteCharacter(id: string) {
  const { error } = await supabase.from('characters').delete().eq('id', id);
  if (error) throw error;
}

// ---- Likes por personaje (valoración positiva independiente) ----

export type CharacterLikeState = { count: number; liked: boolean };

export async function fetchCharacterLikeState(
  characterId: string,
  viewerId: string
): Promise<CharacterLikeState> {
  const [{ count, error: countError }, { data: mine, error: mineError }] = await Promise.all([
    supabase
      .from('character_likes')
      .select('character_id', { count: 'exact', head: true })
      .eq('character_id', characterId),
    supabase
      .from('character_likes')
      .select('character_id')
      .eq('character_id', characterId)
      .eq('liker_id', viewerId)
      .maybeSingle(),
  ]);
  if (countError) throw countError;
  if (mineError) throw mineError;
  return { count: count ?? 0, liked: mine !== null };
}

export async function setCharacterLike(characterId: string, viewerId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase
      .from('character_likes')
      .insert({ character_id: characterId, liker_id: viewerId });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('character_likes')
      .delete()
      .eq('character_id', characterId)
      .eq('liker_id', viewerId);
    if (error) throw error;
  }
}
