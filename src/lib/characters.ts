import { supabase } from '@/lib/supabase';

export type CharacterStatus = 'looking' | 'playing' | 'retired';

export const CHARACTER_STATUS_LABELS: Record<CharacterStatus, string> = {
  looking: 'Buscando mesa',
  playing: 'En juego',
  retired: 'Retirado / galería',
};

export type Character = {
  id: string;
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
  portrait_url: string | null;
  system_id: number | null;
  archetype: string | null;
  level: string | null;
  concept: string | null;
  backstory: string | null;
  status: CharacterStatus;
};

const CHARACTER_FIELDS = `id, name, system_id, archetype, level, concept, backstory,
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
