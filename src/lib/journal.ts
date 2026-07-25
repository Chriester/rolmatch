import { supabase } from '@/lib/supabase';

export type JournalEntry = {
  id: string;
  group_id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  profiles: { alias: string; avatar_url: string | null } | null;
};

const JOURNAL_SELECT =
  'id, group_id, author_id, body, image_url, created_at, profiles(alias, avatar_url)';

// Entradas del historico, mas reciente primero.
export async function fetchJournalEntries(groupId: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('group_journal_entries')
    .select(JOURNAL_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as JournalEntry[];
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

export async function deleteJournalEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('group_journal_entries').delete().eq('id', entryId);
  if (error) throw error;
}
