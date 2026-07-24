import { supabase } from '@/lib/supabase';

export type GameSession = {
  id: string;
  group_id: string;
  starts_at: string;
  title: string | null;
};

export async function fetchUpcomingSessions(groupId: string): Promise<GameSession[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, group_id, starts_at, title')
    .eq('group_id', groupId)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function createSession(
  groupId: string,
  createdBy: string,
  startsAt: Date,
  title: string | null
): Promise<GameSession> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      group_id: groupId,
      created_by: createdBy,
      starts_at: startsAt.toISOString(),
      title,
    })
    .select('id, group_id, starts_at, title')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Parsea "AAAA-MM-DD" + "HH:MM" en hora local del dispositivo.
 * Devuelve null si el formato no es válido o la fecha ya pasó.
 */
export function parseSessionDateTime(dateText: string, timeText: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
  if (!dateMatch || !timeMatch) return null;
  const parsed = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2])
  );
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now()) return null;
  return parsed;
}

// Hora local de inicio de cada franja (alineado con el matching)
const SLOT_START_HOUR: Record<number, number> = { 0: 8, 1: 14, 2: 20, 3: 2 };

/**
 * Próxima ocurrencia del horario habitual de la mesa (día × franja) en la
 * hora local del dispositivo — para pre-rellenar el formulario.
 */
export function nextRegularSession(
  sessionWeekday: number | null,
  sessionSlot: number | null
): Date | null {
  if (sessionWeekday === null || sessionSlot === null) return null;
  const now = new Date();
  // weekday de la DB: 0 = lunes; getDay(): 0 = domingo
  const targetDay = (sessionWeekday + 1) % 7;
  const candidate = new Date(now);
  candidate.setHours(SLOT_START_HOUR[sessionSlot], 0, 0, 0);
  let daysAhead = (targetDay - candidate.getDay() + 7) % 7;
  if (daysAhead === 0 && candidate.getTime() <= now.getTime()) daysAhead = 7;
  candidate.setDate(candidate.getDate() + daysAhead);
  return candidate;
}
