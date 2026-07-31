// Votaciones de sesión v2: el GM propone fechas concretas (con hora) y la
// mesa multivota; los jugadores pueden proponer una fecha extra que cae en
// la bandeja del GM (añadir/rechazar). La ganadora la fija el GM como
// sesión real. Los extras de la migración 00030 (closes_at, propuestas)
// degradan con gracia si aún no está aplicada.

import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type PollOption = {
  id: string;
  starts_at: string;
  votes: number;
  mine: boolean;
};

export type PollProposal = {
  id: string;
  poll_id: string;
  proposer_id: string;
  proposer_alias: string;
  starts_at: string;
  status: 'pending' | 'accepted' | 'rejected';
};

export type SessionPoll = {
  id: string;
  group_id: string;
  created_by: string;
  title: string | null;
  status: 'open' | 'closed';
  created_at: string;
  closes_at: string | null;
  options: PollOption[];
  /** GM: todas las pendientes · jugador: solo las suyas */
  proposals: PollProposal[];
};

export async function fetchPolls(groupId: string, viewerId: string): Promise<SessionPoll[]> {
  const { data, error } = await supabase
    .from('session_polls')
    .select('id, group_id, created_by, title, status, created_at, session_poll_options(id, starts_at, session_poll_votes(user_id))')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;

  const polls = (data ?? []).map((row) => {
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
      closes_at: null as string | null,
      proposals: [] as PollProposal[],
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

  // extras de la migración 00030 — en dos consultas aparte para que la
  // pantalla siga funcionando aunque no esté aplicada
  try {
    const ids = polls.map((p) => p.id);
    if (ids.length > 0) {
      const [{ data: extras }, { data: proposals }] = await Promise.all([
        supabase.from('session_polls').select('id, closes_at').in('id', ids),
        supabase
          .from('session_poll_proposals')
          .select('id, poll_id, proposer_id, starts_at, status, profiles(alias)')
          .in('poll_id', ids)
          .order('created_at', { ascending: true }),
      ]);
      const closesById = new Map((extras ?? []).map((e) => [e.id, e.closes_at]));
      for (const poll of polls) {
        poll.closes_at = closesById.get(poll.id) ?? null;
        poll.proposals = (proposals ?? [])
          .filter((p) => p.poll_id === poll.id)
          .map((p) => {
            const raw = p as unknown as { profiles: { alias: string } | null } & typeof p;
            return {
              id: p.id,
              poll_id: p.poll_id,
              proposer_id: p.proposer_id,
              starts_at: p.starts_at,
              status: p.status as PollProposal['status'],
              proposer_alias: raw.profiles?.alias ?? 'Alguien',
            };
          });
      }
    }
  } catch {
    // migración 00030 sin aplicar: sin deadlines ni propuestas
  }

  return polls;
}

export async function createPoll(
  groupId: string,
  createdBy: string,
  title: string | null,
  optionDates: Date[],
  closesAt: Date | null
): Promise<void> {
  const base = { group_id: groupId, created_by: createdBy, title };
  // closes_at solo si la migración 00030 está aplicada; si falla, sin deadline
  let pollId: string;
  if (closesAt) {
    const { data, error } = await supabase
      .from('session_polls')
      .insert({ ...base, closes_at: closesAt.toISOString() })
      .select('id')
      .single();
    if (error) {
      const { data: retry, error: retryError } = await supabase
        .from('session_polls')
        .insert(base)
        .select('id')
        .single();
      if (retryError) throw retryError;
      pollId = retry.id;
    } else {
      pollId = data.id;
    }
  } else {
    const { data, error } = await supabase
      .from('session_polls')
      .insert(base)
      .select('id')
      .single();
    if (error) throw error;
    pollId = data.id;
  }

  const { error: optionsError } = await supabase.from('session_poll_options').insert(
    optionDates.map((date) => ({ poll_id: pollId, starts_at: date.toISOString() }))
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

/** Un jugador propone una fecha extra: cae en la bandeja del GM. */
export async function proposeDate(pollId: string, proposerId: string, date: Date) {
  const { error } = await supabase
    .from('session_poll_proposals')
    .insert({ poll_id: pollId, proposer_id: proposerId, starts_at: date.toISOString() });
  if (error) throw error;
}

/**
 * Cambios en votaciones (crear/cerrar, opciones, votos, propuestas): avisa
 * con debounce y el llamante refresca con fetchPolls. Votos y opciones no
 * llevan group_id, así que escuchamos las tablas sin filtro y el refetch
 * (con RLS) decide qué se ve. Requiere la migración 00039 (publication).
 */
export function subscribeToPolls(groupId: string, onChange: () => void): RealtimeChannel {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const notify = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, 400);
  };
  let channel = supabase.channel(`polls:group:${groupId}`);
  for (const table of [
    'session_polls',
    'session_poll_options',
    'session_poll_votes',
    'session_poll_proposals',
  ]) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, notify);
  }
  return channel.subscribe();
}

export function unsubscribeFromPolls(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}

/** El GM añade la propuesta como opción de la votación, o la rechaza. */
export async function resolveProposal(proposal: PollProposal, accept: boolean) {
  if (accept) {
    const { error } = await supabase
      .from('session_poll_options')
      .insert({ poll_id: proposal.poll_id, starts_at: proposal.starts_at });
    if (error) throw error;
  }
  const { error } = await supabase
    .from('session_poll_proposals')
    .update({ status: accept ? 'accepted' : 'rejected' })
    .eq('id', proposal.id);
  if (error) throw error;
}
