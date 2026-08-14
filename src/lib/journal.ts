import { hasColumn, supabase } from '@/lib/supabase';

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

/** Edita el texto propio de un recuerdo (la RLS rechaza los ajenos y la cabecera de sistema, migr. 00061). */
export async function editJournalEntry(entryId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('group_journal_entries')
    .update({ body: body.trim() })
    .eq('id', entryId);
  if (error) throw error;
}

// ============================================================
// Página pública de campaña (migr. 00060): el histórico como crónica
// legible sin cuenta, opt-in del GM.
// ============================================================

/** Estado del toggle, o null si la migración 00060 no está aplicada. */
export async function fetchJournalPublic(groupId: string): Promise<boolean | null> {
  if (!(await hasColumn('groups', 'journal_public'))) return null;
  const { data, error } = await supabase
    .from('groups')
    .select('journal_public')
    .eq('id', groupId)
    .single();
  if (error) throw error;
  return data?.journal_public ?? false;
}

export async function setJournalPublic(groupId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .update({ journal_public: isPublic })
    .eq('id', groupId);
  if (error) throw error;
}

export type CampaignPage = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  format: string;
  created_at: string;
  system_name: string | null;
};

/** Ficha pública de la campaña, o null si no existe o no es pública. */
export async function fetchCampaignPage(groupId: string): Promise<CampaignPage | null> {
  try {
    const { data, error } = await supabase
      .from('campaign_pages')
      .select('id, name, description, image_url, format, created_at, system_name')
      .eq('id', groupId)
      .maybeSingle();
    if (error) throw error;
    return (data as CampaignPage | null) ?? null;
  } catch {
    // migración 00060 sin aplicar
    return null;
  }
}

/** Entradas públicas, adaptadas a JournalEntry para reutilizar los capítulos. */
export async function fetchCampaignJournal(groupId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('campaign_journal')
    .select('id, group_id, body, image_url, session_id, is_system, created_at, author_alias')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    group_id: row.group_id as string,
    author_id: '',
    body: (row.body as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    session_id: (row.session_id as string | null) ?? null,
    is_system: Boolean(row.is_system),
    created_at: row.created_at as string,
    profiles: row.author_alias ? { alias: row.author_alias as string, avatar_url: null } : null,
  }));
}
