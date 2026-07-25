// Sistema de niveles v1 (solo cosmético): el XP lo otorga la base de datos
// con triggers (migración 00016); aquí solo se lee el total y se traduce a
// nivel + título rolero. Curva: subir al nivel L cuesta 50·L·(L−1) XP en
// total (100 para el 2, 300 para el 3, 600 para el 4…).

export type LevelInfo = {
  level: number;
  title: string;
  totalXp: number;
  /** XP acumulado necesario para el nivel actual */
  levelFloor: number;
  /** XP acumulado necesario para el siguiente nivel */
  nextLevelAt: number;
  /** progreso 0-1 dentro del nivel actual */
  progress: number;
};

/** XP total acumulado necesario para alcanzar el nivel dado. */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  return Math.floor((1 + Math.sqrt(1 + (2 * totalXp) / 25)) / 2);
}

// Títulos roleros por tramo de nivel (neutros en género a propósito)
const TITLES: [number, string][] = [
  [20, 'Mito viviente'],
  [16, 'Leyenda local'],
  [12, 'Azote de mazmorras'],
  [8, 'Acero templado'],
  [5, 'Voz de la posada'],
  [3, 'Alma de taberna'],
  [1, 'Dado prestado'],
];

export function titleForLevel(level: number): string {
  const found = TITLES.find(([min]) => level >= min);
  return found ? found[1] : TITLES[TITLES.length - 1][1];
}

export function levelInfoFromXp(totalXp: number): LevelInfo {
  const level = levelFromXp(totalXp);
  const levelFloor = xpForLevel(level);
  const nextLevelAt = xpForLevel(level + 1);
  return {
    level,
    title: titleForLevel(level),
    totalXp,
    levelFloor,
    nextLevelAt,
    progress: Math.min(1, (totalXp - levelFloor) / (nextLevelAt - levelFloor)),
  };
}

/** Totales de XP para un conjunto de perfiles (vista agregada pública). */
export async function fetchXpTotals(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  // import perezoso: mantiene el módulo puro para poder testear la curva en Jest
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('profile_xp')
    .select('user_id, total_xp')
    .in('user_id', userIds);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.user_id as string, row.total_xp as number]));
}
