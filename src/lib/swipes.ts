import { supabase } from '@/lib/supabase';

export type SwipeDirection = 'like' | 'pass';

/**
 * Swipe del jugador sobre una mesa, con personaje propuesto opcional (§4.2).
 * Desde la 00040 el match solo lo cierra la mesa (el aceptar del GM), así
 * que aquí `matched` es prácticamente siempre false — se conserva por si
 * el aceptar llega en carrera.
 */
export async function swipeOnGroup(
  userId: string,
  groupId: string,
  direction: SwipeDirection,
  proposedCharacterId: string | null = null
): Promise<boolean> {
  const { error } = await supabase.from('swipes').insert({
    user_id: userId,
    group_id: groupId,
    origin: 'user',
    direction,
    proposed_character_id: direction === 'like' ? proposedCharacterId : null,
  });
  if (error) throw error;
  return direction === 'like' ? hasMatch(userId, groupId) : false;
}

/** Swipe de la mesa (su dueño) sobre un candidato. Devuelve true si se produjo match. */
export async function groupSwipeOnUser(
  groupId: string,
  userId: string,
  direction: SwipeDirection
): Promise<boolean> {
  const payload = { user_id: userId, group_id: groupId, origin: 'group', direction };
  let { error } = await supabase.from('swipes').insert(payload);
  if (error && error.code === '23505') {
    // el GM ya había fichado al jugador desde el feed: rearmamos el like
    // para que el trigger de aceptación vuelva a evaluar el match
    await undoGroupSwipeOnUser(groupId, userId);
    ({ error } = await supabase.from('swipes').insert(payload));
  }
  if (error) throw error;
  return direction === 'like' ? hasMatch(userId, groupId) : false;
}

/** Rewind (premium): deshace el swipe del jugador sobre una mesa. */
export async function undoSwipeOnGroup(userId: string, groupId: string) {
  const { error } = await supabase
    .from('swipes')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('origin', 'user');
  if (error) throw error;
}

/** Rewind (premium): deshace el swipe de la mesa sobre un candidato. */
export async function undoGroupSwipeOnUser(groupId: string, userId: string) {
  const { error } = await supabase
    .from('swipes')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('origin', 'group');
  if (error) throw error;
}

/**
 * Vuelve a barajar: borra mis «pass» (como jugador y, si tengo mesas, los
 * de mis mesas sobre candidatos). Los likes se conservan — solo reaparece
 * en el feed lo que descartaste. Vital en una alpha con pool pequeño.
 */
export async function resetPasses(userId: string): Promise<void> {
  const { error } = await supabase
    .from('swipes')
    .delete()
    .eq('user_id', userId)
    .eq('origin', 'user')
    .eq('direction', 'pass');
  if (error) throw error;

  const { data: myGroups } = await supabase.from('groups').select('id').eq('owner_id', userId);
  const groupIds = (myGroups ?? []).map((g) => g.id);
  if (groupIds.length > 0) {
    const { error: groupError } = await supabase
      .from('swipes')
      .delete()
      .in('group_id', groupIds)
      .eq('origin', 'group')
      .eq('direction', 'pass');
    if (groupError) throw groupError;
  }
}

/** Mi swipe previo sobre una mesa (para el botón «pedir sitio» del perfil). */
export async function fetchMySwipeOnGroup(
  userId: string,
  groupId: string
): Promise<SwipeDirection | null> {
  const { data, error } = await supabase
    .from('swipes')
    .select('direction')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('origin', 'user')
    .maybeSingle();
  if (error) throw error;
  return (data?.direction as SwipeDirection) ?? null;
}

/** El trigger de la DB crea el match al segundo like recíproco; aquí solo lo consultamos. */
async function hasMatch(userId: string, groupId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
