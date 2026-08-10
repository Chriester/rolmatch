// Novedades: lo que te has perdido desde la última vez.
//
// Hasta ahora, si no veías el push no había ni rastro: los matches, las
// votaciones abiertas y las solicitudes de sitio solo existían dentro de la
// pantalla donde vivían, y había que ir a buscarlas mesa por mesa. Esto lo
// junta en un sitio, que es la única razón de peso para volver mañana.
//
// Todo son consultas acotadas a MIS mesas; nada aquí es tiempo real, se
// recalcula al abrir la pantalla.

import { supabase } from '@/lib/supabase';

export type ActivityKind = 'match' | 'applicant' | 'poll' | 'session';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  emoji: string;
  title: string;
  detail: string;
  /** cuándo pasó (o cuándo toca): ordena la lista */
  at: string;
  route: { pathname: string; params: Record<string, string> };
};

const RECENT_DAYS = 14;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (hours < 1) return 'ahora mismo';
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function fetchActivity(userId: string): Promise<ActivityItem[]> {
  const [{ data: memberships }, { data: myGroups }] = await Promise.all([
    supabase.from('group_members').select('group_id, groups(id, name)').eq('user_id', userId),
    supabase.from('groups').select('id, name').eq('owner_id', userId).eq('is_active', true),
  ]);

  const nameByGroup = new Map<string, string>();
  for (const row of memberships ?? []) {
    const group = row.groups as unknown as { id: string; name: string } | null;
    if (group) nameByGroup.set(group.id, group.name);
  }
  for (const group of myGroups ?? []) nameByGroup.set(group.id, group.name);

  const myGroupIds = (myGroups ?? []).map((g) => g.id);
  const memberGroupIds = [...nameByGroup.keys()];
  if (memberGroupIds.length === 0 && myGroupIds.length === 0) return [];

  const since = daysAgo(RECENT_DAYS);
  const [matches, applicants, polls, myVotes, sessions] = await Promise.all([
    supabase
      .from('matches')
      .select('id, group_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', since),
    myGroupIds.length > 0
      ? supabase
          .from('swipes')
          .select('user_id, group_id, created_at')
          .in('group_id', myGroupIds)
          .eq('origin', 'user')
          .eq('direction', 'like')
          .gte('created_at', since)
      : Promise.resolve({ data: [] }),
    memberGroupIds.length > 0
      ? supabase
          .from('session_polls')
          .select('id, group_id, title, created_at')
          .in('group_id', memberGroupIds)
          .eq('status', 'open')
      : Promise.resolve({ data: [] }),
    supabase.from('session_poll_votes').select('option_id').eq('user_id', userId),
    memberGroupIds.length > 0
      ? supabase
          .from('sessions')
          .select('id, group_id, starts_at, title')
          .in('group_id', memberGroupIds)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const items: ActivityItem[] = [];

  for (const match of matches.data ?? []) {
    const name = nameByGroup.get(match.group_id) ?? 'una mesa';
    items.push({
      id: `match-${match.id}`,
      kind: 'match',
      emoji: '🤝',
      title: `¡Match con «${name}»!`,
      detail: `Ya estás dentro · ${relative(match.created_at)}`,
      at: match.created_at,
      route: { pathname: '/groups/[id]', params: { id: match.group_id } },
    });
  }

  // Solicitudes de sitio: quien ha pedido entrar y aún no es miembro
  const applicantsByGroup = new Map<string, { count: number; at: string }>();
  for (const swipe of applicants.data ?? []) {
    const previous = applicantsByGroup.get(swipe.group_id);
    applicantsByGroup.set(swipe.group_id, {
      count: (previous?.count ?? 0) + 1,
      at: previous && previous.at > swipe.created_at ? previous.at : swipe.created_at,
    });
  }
  for (const [groupId, info] of applicantsByGroup) {
    items.push({
      id: `applicants-${groupId}`,
      kind: 'applicant',
      emoji: '🙋',
      title:
        info.count === 1
          ? `1 persona pide sitio en «${nameByGroup.get(groupId) ?? 'tu mesa'}»`
          : `${info.count} personas piden sitio en «${nameByGroup.get(groupId) ?? 'tu mesa'}»`,
      detail: `Decides tú · ${relative(info.at)}`,
      at: info.at,
      route: { pathname: '/groups/[id]/candidates', params: { id: groupId } },
    });
  }

  // Votaciones abiertas en las que aún no he votado nada
  const votedOptions = new Set((myVotes.data ?? []).map((v) => v.option_id as string));
  const openPolls = polls.data ?? [];
  if (openPolls.length > 0) {
    const { data: options } = await supabase
      .from('session_poll_options')
      .select('id, poll_id')
      .in(
        'poll_id',
        openPolls.map((p) => p.id)
      );
    const votedPolls = new Set(
      (options ?? [])
        .filter((option) => votedOptions.has(option.id as string))
        .map((option) => option.poll_id as string)
    );
    for (const poll of openPolls) {
      if (votedPolls.has(poll.id)) continue;
      items.push({
        id: `poll-${poll.id}`,
        kind: 'poll',
        emoji: '🗳️',
        title: `Falta tu voto en «${nameByGroup.get(poll.group_id) ?? 'tu mesa'}»`,
        detail: poll.title ? `${poll.title} · ${relative(poll.created_at)}` : 'Elegid fecha',
        at: poll.created_at,
        route: { pathname: '/groups/[id]/schedule', params: { id: poll.group_id } },
      });
    }
  }

  for (const gameSession of sessions.data ?? []) {
    items.push({
      id: `session-${gameSession.id}`,
      kind: 'session',
      emoji: '📅',
      title: `Partida en «${nameByGroup.get(gameSession.group_id) ?? 'tu mesa'}»`,
      detail: whenLabel(gameSession.starts_at),
      at: gameSession.starts_at,
      route: { pathname: '/groups/[id]/schedule', params: { id: gameSession.group_id } },
    });
  }

  // lo más reciente (o lo más inminente) arriba
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
