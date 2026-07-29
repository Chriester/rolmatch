import { supabase } from '@/lib/supabase';

export type JournalEntry = {
  id: string;
  group_id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  session_id: string | null;
  is_system: boolean;
  created_at: string;
  profiles: { alias: string; avatar_url: string | null } | null;
};

export type JournalChapter = {
  sessionId: string | null;
  /** entrada de sistema "Partida del <dia>" de esa sesion, si ya existe */
  header: JournalEntry | null;
  /** entradas de jugadores, orden cronologico ascendente */
  entries: JournalEntry[];
};

const JOURNAL_SELECT =
  'id, group_id, author_id, body, image_url, session_id, is_system, created_at, profiles(alias, avatar_url)';

// Todas las entradas, orden cronologico ascendente (para agrupar por sesion).
export async function fetchJournalEntries(groupId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('group_journal_entries')
    .select(JOURNAL_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as JournalEntry[];
}

/**
 * Agrupa las entradas por sesion (capitulo "Partida del <dia>"), capitulo
 * mas reciente primero y entradas en orden cronologico dentro de cada uno.
 * Las entradas sin sesion (anteriores a la migr. 00028) forman su propio
 * capitulo con sessionId null.
 */
export function groupJournalEntries(entries: JournalEntry[]): JournalChapter[] {
  const order: (string | null)[] = [];
  const bySession = new Map<string | null, JournalChapter>();
  for (const entry of entries) {
    const key = entry.session_id;
    let chapter = bySession.get(key);
    if (!chapter) {
      chapter = { sessionId: key, header: null, entries: [] };
      bySession.set(key, chapter);
      order.push(key);
    }
    if (entry.is_system) chapter.header = entry;
    else chapter.entries.push(entry);
  }
  return order.map((key) => bySession.get(key)!).reverse();
}

export async function addJournalEntry(
  groupId: string,
  authorId: string,
  body: string | null,
  imageUrl: string | null
): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('group_journal_entries')
    .insert({
      group_id: groupId,
      author_id: authorId,
      body: body?.trim() || null,
      image_url: imageUrl,
    })
    .select(JOURNAL_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as JournalEntry;
}

/**
 * Crea el mensaje de sistema "Partida del <dia>" de la sesion de hoy si
 * todavia no existe. Idempotente: si otro miembro se adelanto, el indice
 * unico rechaza el insert (23505) y lo ignoramos en silencio.
 */
export async function ensureTodayHeader(
  groupId: string,
  authorId: string,
  dateLabel: string
): Promise<void> {
  const { error } = await supabase.from('group_journal_entries').insert({
    group_id: groupId,
    author_id: authorId,
    body: `🎲 Partida del ${dateLabel}`,
    is_system: true,
  });
  if (error && error.code !== '23505') throw error;
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('group_journal_entries').delete().eq('id', entryId);
  if (error) throw error;
}
