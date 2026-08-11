// Datos de «Mis mesas» rediseñada (entregable 4a): la lista deja de ser un
// archivo y pasa a ser la bandeja de entrada de tus partidas. Todo lo que
// enseña cada fila (no leídos, solicitudes, votos que faltan, próxima
// partida, aviso de inactividad) se trae AQUÍ en consultas por lotes —
// nada de N consultas por mesa.

import { pendingApplicants } from '@/lib/activity';
import { fetchMyChats } from '@/lib/messages';
import { hasColumn, supabase } from '@/lib/supabase';
import type { GroupFormat } from '@/lib/groups';

export type MyTableRow = {
  id: string;
  name: string;
  image_url: string | null;
  format: GroupFormat;
  is_active: boolean;
  systemName: string | null;
  role: 'gm' | 'player';
  /** miembros sin contar al GM */
  players: number;
  freeSeats: number;
  gmAlias: string | null;
  unread: number;
  applicants: number;
  voteAwaits: boolean;
  /** aviso de inactividad activo (migr. 00052) */
  warned: boolean;
  nextSession: { startsAt: string; title: string | null } | null;
};

export type TodaySpotlight = {
  groupId: string;
  groupName: string;
  startsAt: string;
  title: string | null;
  confirmed: number;
  members: number;
};

export type MyTablesOverview = {
  tables: MyTableRow[];
  /** la partida de HOY más próxima entre todas mis mesas */
  today: TodaySpotlight | null;
};

type GroupRow = {
  id: string;
  name: string;
  image_url: string | null;
  format: GroupFormat;
  is_active: boolean;
  owner_id: string;
  max_players: number;
  inactivity_warned_at?: string | null;
  systems: { name: string } | null;
};

type MemberRow = { user_id: string; profiles: { alias: string } | null };

export async function fetchMyTablesOverview(userId: string): Promise<MyTablesOverview> {
  const withVitality = await hasColumn('groups', 'inactivity_warned_at');
  const columns = `id, name, image_url, format, is_active, owner_id, max_players,
     ${withVitality ? 'inactivity_warned_at,' : ''}
     systems(name),
     group_members!inner(user_id)`;

  const { data, error } = await supabase
    .from('groups')
    .select(columns)
    .eq('group_members.user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // el !inner filtra por MI membresía pero recorta la lista embebida a mi
  // fila; la lista completa de miembros se pide aparte
  const groups = ((data ?? []) as unknown[]) as GroupRow[];
  const groupIds = groups.map((g) => g.id);
  const { data: allMembers } =
    groupIds.length > 0
      ? await supabase
          .from('group_members')
          .select('group_id, user_id, profiles(alias)')
          .in('group_id', groupIds)
      : { data: [] };
  const membersByGroup = new Map<string, MemberRow[]>();
  for (const row of allMembers ?? []) {
    const list = membersByGroup.get(row.group_id) ?? [];
    list.push(row as unknown as MemberRow);
    membersByGroup.set(row.group_id, list);
  }

  if (groups.length === 0) return { tables: [], today: null };

  const ownedIds = groups.filter((g) => g.owner_id === userId).map((g) => g.id);

  const [chats, applicantData, pollData, sessionData] = await Promise.all([
    fetchMyChats(userId).catch(() => []),
    ownedIds.length > 0
      ? Promise.all([
          supabase
            .from('swipes')
            .select('user_id, group_id, created_at')
            .in('group_id', ownedIds)
            .eq('origin', 'user')
            .eq('direction', 'like'),
          supabase.from('swipes').select('user_id, group_id').in('group_id', ownedIds).eq('origin', 'group'),
          supabase.from('group_members').select('user_id, group_id').in('group_id', ownedIds),
        ])
      : Promise.resolve(null),
    Promise.all([
      supabase.from('session_polls').select('id, group_id').in('group_id', groupIds).eq('status', 'open'),
      supabase.from('session_poll_votes').select('option_id').eq('user_id', userId),
    ]),
    supabase
      .from('sessions')
      .select('id, group_id, starts_at, title')
      .in('group_id', groupIds)
      .gte('starts_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .order('starts_at', { ascending: true }),
  ]);

  // no leídos por mesa (reutiliza el resumen exacto del chat, migr. 00041)
  const unreadByGroup = new Map(chats.map((chat) => [chat.groupId, chat.unread]));

  // solicitudes pendientes por mesa (misma lógica que Novedades, testeada)
  let applicantsByGroup = new Map<string, { count: number; at: string }>();
  if (applicantData) {
    const [likes, decided, roster] = applicantData;
    const resolved = new Set(
      [...(decided.data ?? []), ...(roster.data ?? [])].map((r) => `${r.group_id}:${r.user_id}`)
    );
    applicantsByGroup = pendingApplicants(likes.data ?? [], resolved);
  }

  // mesas con votación abierta en la que aún no he votado
  const [polls, myVotes] = pollData;
  const votedOptions = new Set((myVotes.data ?? []).map((v) => v.option_id as string));
  const openPolls = polls.data ?? [];
  const voteAwaitsGroups = new Set<string>();
  if (openPolls.length > 0) {
    const { data: options } = await supabase
      .from('session_poll_options')
      .select('id, poll_id')
      .in('poll_id', openPolls.map((p) => p.id));
    const votedPolls = new Set(
      (options ?? [])
        .filter((option) => votedOptions.has(option.id as string))
        .map((option) => option.poll_id as string)
    );
    for (const poll of openPolls) {
      if (!votedPolls.has(poll.id)) voteAwaitsGroups.add(poll.group_id as string);
    }
  }

  // próxima sesión por mesa + spotlight de HOY (con sus confirmaciones)
  const sessions = sessionData.data ?? [];
  const nextByGroup = new Map<string, { startsAt: string; title: string | null }>();
  for (const s of sessions) {
    if (!nextByGroup.has(s.group_id)) {
      nextByGroup.set(s.group_id, { startsAt: s.starts_at, title: s.title ?? null });
    }
  }
  const now = new Date();
  const todaySession = sessions.find((s) => {
    const d = new Date(s.starts_at);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  let today: TodaySpotlight | null = null;
  if (todaySession) {
    const { count } = await supabase
      .from('session_confirmations')
      .select('user_id', { count: 'exact', head: true })
      .eq('session_id', todaySession.id);
    const group = groups.find((g) => g.id === todaySession.group_id);
    if (group) {
      today = {
        groupId: group.id,
        groupName: group.name,
        startsAt: todaySession.starts_at,
        title: todaySession.title ?? null,
        confirmed: count ?? 0,
        members: (membersByGroup.get(group.id) ?? []).length,
      };
    }
  }

  const tables = groups.map((g): MyTableRow => {
    const members = membersByGroup.get(g.id) ?? [];
    const players = members.filter((m) => m.user_id !== g.owner_id).length;
    const gm = members.find((m) => m.user_id === g.owner_id);
    return {
      id: g.id,
      name: g.name,
      image_url: g.image_url,
      format: g.format,
      is_active: g.is_active,
      systemName: g.systems?.name ?? null,
      role: g.owner_id === userId ? 'gm' : 'player',
      players,
      freeSeats: Math.max(0, g.max_players - players),
      gmAlias: gm?.profiles?.alias ?? null,
      unread: unreadByGroup.get(g.id) ?? 0,
      applicants: applicantsByGroup.get(g.id)?.count ?? 0,
      voteAwaits: voteAwaitsGroups.has(g.id),
      warned: withVitality ? g.inactivity_warned_at != null : false,
      nextSession: nextByGroup.get(g.id) ?? null,
    };
  });

  return { tables, today };
}
