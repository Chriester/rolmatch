// Votaciones de sesión: proponer días/franjas y que la mesa vote cuáles
// le van bien (multivoto). La ganadora la programa el GM como sesión real.

import { supabase } from '@/lib/supabase';

export type PollOption = {
  id: string;
  starts_at: string;
  votes: number;
  mine: boolean;
};

export type SessionPoll = {
  id: string;
  group_id: string;
  created_by: string;
  title: string | null;
  status: 'open' | 'closed';
  created_at: string;
  options: PollOption[];
};

export async function fetchPolls(groupId: string, viewerId: string): Promise<SessionPoll[]> {
  const { data, error } = await supabase
    .from('session_polls')
    .select('id, group_id, created_by, title, status, created_at, session_poll_options(id, starts_at, session_poll_votes(user_id))')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const raw = row as unknown as {
      id: string;
      group_id: string;
      created_by: string;
      title: string | null;
      status: 'open' | 'closed';
      created_at: string;
      session_poll_options: { id: string; starts_at: string; session_poll_votes: { user_id: string }[] }[];
    };
    return {
      ...raw,
      options: raw.session_poll_options
        .map((option) => ({
          id: option.id,
          starts_at: option.starts_at,
          votes: option.session_poll_votes.length,
          mine: option.session_poll_votes.some((v) => v.user_id === viewerId),
        }))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    };
  });
}

export async function createPoll(
  groupId: string,
  createdBy: string,
  title: string | null,
  optionDates: Date[]
): Promise<void> {
  const { data, error } = await supabase
    .from('session_polls')
    .insert({ group_id: groupId, created_by: createdBy, title })
    .select('id')
    .single();
  if (error) throw error;

  const { error: optionsError } = await supabase.from('session_poll_options').insert(
    optionDates.map((date) => ({ poll_id: data.id, starts_at: date.toISOString() }))
  );
  if (optionsError) throw optionsError;
}

export async function setVote(optionId: string, userId: string, voted: boolean) {
  if (voted) {
    const { error } = await supabase
      .from('session_poll_votes')
      .insert({ option_id: optionId, user_id: userId });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('session_poll_votes')
      .delete()
      .eq('option_id', optionId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

export async function closePoll(pollId: string) {
  const { error } = await supabase
    .from('session_polls')
    .update({ status: 'closed' })
    .eq('id', pollId);
  if (error) throw error;
}
