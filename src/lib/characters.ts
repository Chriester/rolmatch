import { supabase } from '@/lib/supabase';

export type CharacterStatus = 'looking' | 'playing' | 'retired';

export const CHARACTER_STATUS_LABELS: Record<CharacterStatus, string> = {
  looking: 'Buscando mesa',
  playing: 'En juego',
  retired: 'Retirado / galería',
};

export type Character = {
  id: string;
  is_public: boolean;
  name: string;
  system_id: number | null;
  archetype: string | null;
  level: string | null;
  concept: string | null;
  backstory: string | null;
  status: CharacterStatus;
  portrait_url: string | null;
  systems: { name: string } | null;
};

export type CharacterInput = {
  name: string;
  is_public: boolean;
  portrait_url: string | null;
  system_id: number | null;
  archetype: string | null;
  level: string | null;
  concept: string | null;
  backstory: string | null;
  status: CharacterStatus;
};

const CHARACTER_FIELDS = `id, name, is_public, system_id, archetype, level, concept, backstory,
  status, portrait_url, systems(name)`;

export async function fetchMyCharacters(userId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select(CHARACTER_FIELDS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Character[];
}

export async function fetchCharacter(id: string): Promise<Character> {
  const { data, error } = await supabase
    .from('characters')
    .select(CHARACTER_FIELDS)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as Character;
}

export async function createCharacter(userId: string, input: CharacterInput): Promise<string> {
  const { data, error } = await supabase
    .from('characters')
    .insert({ ...input, user_id: userId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateCharacter(id: string, input: CharacterInput) {
  const { error } = await supabase.from('characters').update(input).eq('id', id);
  if (error) throw error;
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
