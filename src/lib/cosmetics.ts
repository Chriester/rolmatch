// Cosméticos por nivel: marcos de tarjeta y flair de avatar. Mismo patrón
// de unlock que los temas de hoja (lib/sheet-schema.ts) pero solo por nivel
// — los cosméticos premium irían aquí el día que existan. Módulo puro (sin
// supabase) para poder testearlo en Jest.
//
// Anti-trampas sin servidor: la elección se guarda en profiles.card_frame /
// avatar_flair (migr. 00056), pero quien la PINTA valida el nivel del dueño
// (público vía profile_xp) con frameFor/flairFor. Equipar algo sin nivel no
// enseña nada.

export type CosmeticUnlock = { level: number } | 'free';

export type CardFrame = {
  id: string;
  name: string;
  /** color del borde del marco sobre la tarjeta (UI oscura) */
  color: string;
  unlock: CosmeticUnlock;
};

export type AvatarFlair = {
  id: string;
  name: string;
  emoji: string;
  unlock: CosmeticUnlock;
};

// Niveles alineados con los hitos de título (lib/xp.ts) para que subir de
// título casi siempre estrene algo.
export const CARD_FRAMES: CardFrame[] = [
  { id: 'bronce', name: 'Bronce', color: '#C08B5C', unlock: { level: 4 } },
  { id: 'plata', name: 'Plata', color: '#C7CCD8', unlock: { level: 7 } },
  { id: 'arcano', name: 'Arcano', color: '#C77DFF', unlock: { level: 10 } },
  { id: 'oro', name: 'Oro', color: '#F0BE7A', unlock: { level: 14 } },
  { id: 'dragon', name: 'Fuego de dragón', color: '#B01B5E', unlock: { level: 18 } },
  { id: 'esmeralda', name: 'Esmeralda', color: '#3FBF8F', unlock: { level: 22 } },
];

export const AVATAR_FLAIRS: AvatarFlair[] = [
  { id: 'dado', name: 'Dado', emoji: '🎲', unlock: { level: 2 } },
  { id: 'pergamino', name: 'Pergamino', emoji: '📜', unlock: { level: 5 } },
  { id: 'antorcha', name: 'Antorcha', emoji: '🔥', unlock: { level: 8 } },
  { id: 'corona', name: 'Corona', emoji: '👑', unlock: { level: 12 } },
  { id: 'dragon', name: 'Dragón', emoji: '🐉', unlock: { level: 16 } },
  { id: 'cometa', name: 'Cometa', emoji: '☄️', unlock: { level: 20 } },
];

export function isCosmeticUnlocked(unlock: CosmeticUnlock, level: number): boolean {
  return unlock === 'free' || level >= unlock.level;
}

export function cosmeticUnlockLabel(unlock: CosmeticUnlock): string | null {
  return unlock === 'free' ? null : `Nv. ${unlock.level}`;
}

/** Marco a pintar para un dueño con ese nivel, o null (sin marco / sin nivel). */
export function frameFor(frameId: string | null | undefined, level: number): CardFrame | null {
  if (!frameId) return null;
  const frame = CARD_FRAMES.find((f) => f.id === frameId);
  if (!frame || !isCosmeticUnlocked(frame.unlock, level)) return null;
  return frame;
}

/** Flair a pintar para un dueño con ese nivel, o null. */
export function flairFor(flairId: string | null | undefined, level: number): AvatarFlair | null {
  if (!flairId) return null;
  const flair = AVATAR_FLAIRS.find((f) => f.id === flairId);
  if (!flair || !isCosmeticUnlocked(flair.unlock, level)) return null;
  return flair;
}

export type MyCosmetics = { cardFrame: string | null; avatarFlair: string | null };

/** Elección de un usuario (propio o ajeno). Degrada a vacío sin la migración 00056. */
export async function fetchUserCosmetics(userId: string): Promise<MyCosmetics> {
  // import perezoso: mantiene el módulo puro para testear el catálogo en Jest
  const { hasColumn, supabase } = await import('@/lib/supabase');
  if (!(await hasColumn('profiles', 'card_frame'))) {
    return { cardFrame: null, avatarFlair: null };
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('card_frame, avatar_flair')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return { cardFrame: data?.card_frame ?? null, avatarFlair: data?.avatar_flair ?? null };
}

/** Equipa (o quita, con null) un cosmético. No-op sin la migración. */
export async function setMyCosmetic(
  userId: string,
  kind: 'card_frame' | 'avatar_flair',
  id: string | null
) {
  const { hasColumn, supabase } = await import('@/lib/supabase');
  if (!(await hasColumn('profiles', 'card_frame'))) return;
  const { error } = await supabase
    .from('profiles')
    .update({ [kind]: id })
    .eq('id', userId);
  if (error) throw error;
}
