// Sistema de niveles v1 (solo cosmético): el XP lo otorga la base de datos
// con triggers (migración 00016); aquí solo se lee el total y se traduce a
// nivel + título rolero. Curva: cuadrática hasta el nivel 8 (subir al nivel
// L cuesta 50·L·(L−1) XP en total: 100 para el 2, 300 para el 3…) y lineal
// después (800 XP por nivel), para que jugar cada semana siga moviendo la
// barra también en niveles altos.

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

// A partir de aquí la curva deja de ser cuadrática: cada nivel cuesta lo
// mismo que costó el 8 (100·8 = 800 XP), en vez de seguir encareciéndose.
const SOFT_CAP_LEVEL = 8;
const LEVEL_COST_CAP = 100 * SOFT_CAP_LEVEL;

/** XP total acumulado necesario para alcanzar el nivel dado. */
export function xpForLevel(level: number): number {
  if (level <= SOFT_CAP_LEVEL) return 50 * level * (level - 1);
  return 50 * SOFT_CAP_LEVEL * (SOFT_CAP_LEVEL - 1) + LEVEL_COST_CAP * (level - SOFT_CAP_LEVEL);
}

export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  const softCapFloor = xpForLevel(SOFT_CAP_LEVEL);
  if (totalXp < softCapFloor) {
    return Math.floor((1 + Math.sqrt(1 + (2 * totalXp) / 25)) / 2);
  }
  return SOFT_CAP_LEVEL + Math.floor((totalXp - softCapFloor) / LEVEL_COST_CAP);
}

// Títulos roleros por tramo de nivel (neutros en género a propósito):
// hito cada 2-3 niveles para que siempre haya uno a la vista.
const TITLES: [number, string][] = [
  [30, 'Dado de oro'],
  [26, 'Forja de mundos'],
  [23, 'Susurro de los dioses'],
  [20, 'Mito viviente'],
  [18, 'Eco de leyenda'],
  [16, 'Leyenda local'],
  [14, 'Estandarte de la mesa'],
  [12, 'Azote de mazmorras'],
  [10, 'Rompehechizos'],
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

// ============================================================
// Misiones: catálogo estático que espeja los triggers de la DB
// (00016/00017/00032). El cliente solo LEE xp_events; los importes de
// verdad los pone la base de datos.
// ============================================================

export type Mission = {
  kind: string;
  icon: string;
  title: string;
  description: string;
  reward: string;
  /** una vez en la vida de la cuenta */
  once: boolean;
  /** nota de tope para las repetibles */
  capNote?: string;
};

export const MISSIONS: Mission[] = [
  {
    kind: 'profile_complete',
    icon: '🪪',
    title: 'Forja tu identidad',
    description: 'Completa tu perfil con foto y una bio con sustancia.',
    reward: '+100 XP',
    once: true,
  },
  {
    kind: 'first_character',
    icon: '🧝',
    title: 'Primer personaje',
    description: 'Crea tu primer personaje para la vitrina.',
    reward: '+50 XP',
    once: true,
  },
  {
    kind: 'character_complete',
    icon: '📜',
    title: 'Personaje de gala',
    description: 'Un personaje con retrato, sistema, clase y concepto.',
    reward: '+75 XP',
    once: true,
  },
  {
    kind: 'first_group',
    icon: '🏰',
    title: 'Funda tu mesa',
    description: 'Crea tu primera mesa como GM.',
    reward: '+80 XP',
    once: true,
  },
  {
    kind: 'notifications_on',
    icon: '🔔',
    title: 'Siempre alerta',
    description: 'Activa las notificaciones (en Opciones, o instalando el APK).',
    reward: '+40 XP',
    once: true,
  },
  {
    kind: 'match',
    icon: '🤝',
    title: 'Haz match',
    description: 'Cada match entre jugador y mesa da XP a ambos lados.',
    reward: '+40 XP',
    once: false,
    capNote: 'máx. 3 al día',
  },
  {
    kind: 'join_group',
    icon: '⚔️',
    title: 'Únete a una mesa',
    description: 'Entra como jugador en una mesa nueva.',
    reward: '+60 XP',
    once: false,
    capNote: 'máx. 2 al día',
  },
  {
    kind: 'journal_entry',
    icon: '📖',
    title: 'Cronista de la mesa',
    description: 'Escribe en el histórico; con foto vale más.',
    reward: '+30–50 XP',
    once: false,
    capNote: 'máx. 3 al día',
  },
  {
    kind: 'rate_peer',
    icon: '🎲',
    title: 'Valora a tus compañeros',
    description: 'Puntúa la fiabilidad de la gente con la que juegas.',
    reward: '+15 XP',
    once: false,
    capNote: 'máx. 5 al día',
  },
  {
    kind: 'session_played',
    icon: '🕯️',
    title: 'Sesión jugada',
    description: 'Confirmad la sesión entre 3 miembros y todos cobráis.',
    reward: '+150 XP',
    once: false,
    capNote: 'una por sesión',
  },
];

export type MissionProgress = { times: number; earned: number };

/** Desglose del XP propio por tipo de misión (la RLS solo deja ver el tuyo). */
export async function fetchMyXpBreakdown(userId: string): Promise<Map<string, MissionProgress>> {
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase
    .from('xp_events')
    .select('kind, amount')
    .eq('user_id', userId);
  if (error) throw error;
  const byKind = new Map<string, MissionProgress>();
  for (const event of data ?? []) {
    const prev = byKind.get(event.kind) ?? { times: 0, earned: 0 };
    byKind.set(event.kind, { times: prev.times + 1, earned: prev.earned + event.amount });
  }
  return byKind;
}

/** Hitos de título por nivel, de menor a mayor (derivados de TITLES). */
export const TITLE_MILESTONES: { level: number; title: string }[] = [...TITLES]
  .map(([level, title]) => ({ level, title }))
  .sort((a, b) => a.level - b.level);

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
