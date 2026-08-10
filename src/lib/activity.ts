// Novedades: lo que te has perdido desde la última vez.
//
// Hasta ahora, si no veías el push no había ni rastro: los matches, las
// votaciones abiertas y las solicitudes de sitio solo existían dentro de la
// pantalla donde vivían, y había que ir a buscarlas mesa por mesa. Esto lo
// junta en un sitio, que es la única razón de peso para volver mañana.
//
// Todo son consultas acotadas a MIS mesas; nada aquí es tiempo real, se
// recalcula al abrir la pantalla.

import AsyncStorage from '@react-native-async-storage/async-storage';

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

export type ApplicantSwipe = { user_id: string; group_id: string; created_at: string };

/**
 * Agrupa por mesa las solicitudes de sitio PENDIENTES. `resolved` lleva
 * claves `group:user` de lo ya zanjado (swipe del GM en cualquier dirección,
 * o miembro actual): eso no es una novedad. Pura para poder testearla.
 */
export function pendingApplicants(
  likes: ApplicantSwipe[],
  resolved: Set<string>
): Map<string, { count: number; at: string }> {
  const byGroup = new Map<string, { count: number; at: string }>();
  for (const swipe of likes) {
    if (resolved.has(`${swipe.group_id}:${swipe.user_id}`)) continue;
    const previous = byGroup.get(swipe.group_id);
    byGroup.set(swipe.group_id, {
      count: (previous?.count ?? 0) + 1,
      at: previous && previous.at > swipe.created_at ? previous.at : swipe.created_at,
    });
  }
  return byGroup;
}

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
  const [matches, applicants, decided, roster, polls, myVotes, sessions] = await Promise.all([
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
    // lo ya decidido por el GM (like o pass): resuelto, fuera de novedades
    myGroupIds.length > 0
      ? supabase.from('swipes').select('user_id, group_id').in('group_id', myGroupIds).eq('origin', 'group')
      : Promise.resolve({ data: [] }),
    // quien ya está dentro tampoco «pide sitio»
    myGroupIds.length > 0
      ? supabase.from('group_members').select('user_id, group_id').in('group_id', myGroupIds)
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

  // Solicitudes de sitio: solo las pendientes (antes lo resuelto se quedaba
  // 14 días como si nadie lo hubiera atendido).
  const resolved = new Set(
    [...(decided.data ?? []), ...(roster.data ?? [])].map(
      (row) => `${row.group_id}:${row.user_id}`
    )
  );
  const applicantsByGroup = pendingApplicants(applicants.data ?? [], resolved);
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

// ——— Punto de la campana: «hay algo que no has visto» ———
//
// Local por dispositivo (mismo criterio que tutorial.ts: verlo dos veces no
// hace daño y nos ahorra una columna). No vale guardar un timestamp-marca:
// las partidas próximas llevan `at` en el FUTURO y taparían novedades reales
// posteriores. Se guarda la huella de cada item ya visto; `at` va dentro
// para que una solicitud nueva sobre un grupo con solicitudes viejas
// (mismo id agregado, fecha distinta) vuelva a encender el punto.

const SEEN_KEY = 'rolder-novedades-vistas';

/** Exportada para test: la clave de «visto» es id+fecha, no un timestamp. */
export const fingerprints = (items: Pick<ActivityItem, 'id' | 'at'>[]) =>
  items.map((item) => `${item.id}@${item.at}`);

/** true si hay items de novedades que este dispositivo aún no ha visto. */
export async function hasUnseenActivity(userId: string): Promise<boolean> {
  try {
    const items = await fetchActivity(userId);
    if (items.length === 0) return false;
    const stored = await AsyncStorage.getItem(SEEN_KEY);
    const seen = new Set<string>(stored ? (JSON.parse(stored) as string[]) : []);
    return fingerprints(items).some((mark) => !seen.has(mark));
  } catch {
    return false;
  }
}

/** Novedades abierta: todo lo que se enseñó queda como visto. */
export async function markActivitySeen(items: ActivityItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(fingerprints(items)));
  } catch {
    // sin storage: el punto se verá otra vez, no pasa nada
  }
}
