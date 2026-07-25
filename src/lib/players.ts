// Perfil público de un jugador: todo lo que otro usuario autenticado puede
// ver de él — perfil, disponibilidad, sistemas, fiabilidad y personajes
// públicos (el RLS ya recorta los privados).

import { fetchMyCharacters, type Character } from '@/lib/characters';
import { fetchProfileData, type ProfileData } from '@/lib/profile';
import { fetchReliability, type ReliabilitySummary } from '@/lib/ratings';
import { supabase } from '@/lib/supabase';
import { fetchXpTotals } from '@/lib/xp';

export type PlayerSystem = { name: string; experience: string };

export type PlayerProfile = ProfileData & {
  reliability: ReliabilitySummary | null;
  systemsNamed: PlayerSystem[];
  characters: Character[];
  xpTotal: number;
};

const EXPERIENCE_NAMES: Record<string, string> = {
  none: 'sin experiencia',
  beginner: 'novato',
  intermediate: 'intermedio',
  veteran: 'veterano',
};

export async function fetchPlayerProfile(userId: string): Promise<PlayerProfile> {
  const [profile, reliabilityMap, systemsRes, characters, xpMap] = await Promise.all([
    fetchProfileData(userId),
    fetchReliability([userId]),
    supabase.from('user_systems').select('experience, systems(name)').eq('user_id', userId),
    // el RLS recorta a personajes públicos cuando el perfil no es el propio
    fetchMyCharacters(userId),
    fetchXpTotals([userId]).catch(() => new Map<string, number>()),
  ]);
  if (systemsRes.error) throw systemsRes.error;

  const systemsNamed: PlayerSystem[] = (systemsRes.data ?? []).map((row) => {
    const r = row as unknown as { experience: string; systems: { name: string } | null };
    return {
      name: r.systems?.name ?? 'Sistema',
      experience: EXPERIENCE_NAMES[r.experience] ?? r.experience,
    };
  });

  return {
    ...profile,
    reliability: reliabilityMap.get(userId) ?? null,
    systemsNamed,
    characters,
    xpTotal: xpMap.get(userId) ?? 0,
  };
}
