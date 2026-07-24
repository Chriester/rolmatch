import { supabase } from '@/lib/supabase';

export type SwipeDirection = 'like' | 'pass';

/** Swipe del jugador sobre una mesa. Devuelve true si se produjo match. */
export async function swipeOnGroup(
  userId: string,
  groupId: string,
  direction: SwipeDirection
): Promise<boolean> {
  const { error } = await supabase
    .from('swipes')
    .insert({ user_id: userId, group_id: groupId, origin: 'user', direction });
  if (error) throw error;
  return direction === 'like' ? hasMatch(userId, groupId) : false;
}

/** Swipe de la mesa (su dueño) sobre un candidato. Devuelve true si se produjo match. */
export async function groupSwipeOnUser(
  groupId: string,
  userId: string,
  direction: SwipeDirection
): Promise<boolean> {
  const { error } = await supabase
    .from('swipes')
    .insert({ user_id: userId, group_id: groupId, origin: 'group', direction });
  if (error) throw error;
  return direction === 'like' ? hasMatch(userId, groupId) : false;
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
