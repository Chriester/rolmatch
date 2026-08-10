// Feedback in-app (migr. 00050): los testers envían, los moderadores leen.
// Mismo ciclo de vida que los reportes (open → reviewed/actioned).

import { supabase } from '@/lib/supabase';
import type { ReportStatus } from '@/lib/moderation';

export type FeedbackKind = 'idea' | 'problema' | 'otro';

export const FEEDBACK_KINDS: { key: FeedbackKind; emoji: string; label: string }[] = [
  { key: 'idea', emoji: '💡', label: 'Una idea' },
  { key: 'problema', emoji: '🐛', label: 'Algo falla' },
  { key: 'otro', emoji: '💬', label: 'Otra cosa' },
];

export async function sendFeedback(userId: string, kind: FeedbackKind, body: string) {
  const { error } = await supabase
    .from('feedback')
    .insert({ user_id: userId, kind, body: body.trim() });
  if (error) throw error;
}

export type FeedbackItem = {
  id: string;
  kind: FeedbackKind;
  body: string;
  status: ReportStatus;
  created_at: string;
  authorAlias: string | null;
};

/** La cola, solo moderadores (RLS). Lanza si la migración no está aplicada. */
export async function fetchFeedback(status: ReportStatus | 'all' = 'open'): Promise<FeedbackItem[]> {
  let query = supabase
    .from('feedback')
    .select('id, kind, body, status, created_at, profiles(alias)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind as FeedbackKind,
    body: row.body as string,
    status: row.status as ReportStatus,
    created_at: row.created_at as string,
    authorAlias: (row.profiles as unknown as { alias: string } | null)?.alias ?? null,
  }));
}

export async function setFeedbackStatus(feedbackId: string, status: ReportStatus) {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', feedbackId);
  if (error) throw error;
}
