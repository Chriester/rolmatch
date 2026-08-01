// Edge Function: push-notify
// Envía notificaciones push (Expo Push API) a los móviles.
// Disparada por Database Webhooks en INSERT sobre `matches`, `messages`,
// `dm_messages`, `session_polls`, `swipes` y `character_likes`
// (una sola función: distingue por payload.table).
//
// - Match → avisa al jugador y al GM de la mesa.
// - Mensaje → avisa a los miembros de la mesa menos quien lo envía.
// - DM → avisa al otro participante del hilo (migr. 00025).
// - Votación nueva → avisa a la mesa menos quien la creó.
// - Like de jugador a mesa → avisa al GM (nuevo candidato); like de mesa a
//   jugador → teaser sin nombre (la pestaña Likes es el gancho premium).
//   Si el like cierra un match, se calla: ya avisa el push de match.
// - Like a personaje → avisa a su dueño.
//
// Los tokens los registra la app en push_tokens (migr. 00003). El envío va a
// https://exp.host/--/api/v2/push/send (gratis); Expo lo entrega vía FCM, así
// que la APK necesita google-services.json + credenciales FCM V1 en EAS.
// Los tokens caducados (DeviceNotRegistered) se borran de la tabla.
//
// Además de Expo (APK), envía Web Push a los navegadores suscritos en
// web_push_subscriptions (migr. 00024) — el canal de los usuarios de iOS.
//
// Secrets necesarios (Edge Functions → Secrets):
//   WEBHOOK_SECRET     valor compartido con el webhook (cabecera x-webhook-secret)
//   SB_SECRET_KEY      clave sb_secret_... (igual que discord-match)
//   VAPID_PRIVATE_KEY  clave privada VAPID (sin ella el web push se omite)
// SUPABASE_URL la inyecta Supabase automáticamente.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
// La misma clave pública que usa el cliente (src/lib/web-push.ts)
const VAPID_PUBLIC_KEY =
  'BBNJD_C2usP--UtS1sMIjhonYI29SyymoD5DAs8Pry77TvC7MTVfG5mgonImqpm34l4isWZ7AqZgl8unElCklwo';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
if (VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:chrishernandezponce@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type MatchRecord = { id: string; user_id: string; group_id: string };
type MessageRecord = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string | null;
  kind: 'text' | 'gif' | 'sticker' | 'roll' | 'image' | null;
};

type DmMessageRecord = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  kind: 'text' | 'gif' | 'sticker' | 'roll' | 'image' | null;
};

type PollRecord = { id: string; group_id: string; created_by: string; title: string | null };

type SwipeRecord = {
  id: number;
  user_id: string;
  group_id: string;
  origin: 'user' | 'group';
  direction: 'like' | 'pass';
};

type CharacterLikeRecord = { character_id: string; liker_id: string };

type ProposalRecord = { id: string; poll_id: string; proposer_id: string; starts_at: string };

type PollVoteRecord = { option_id: string; user_id: string };

type SessionRecord = {
  id: string;
  group_id: string;
  starts_at: string;
  title: string | null;
  created_by: string;
};

type ReportRecord = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_group_id: string | null;
  reason: string;
};


type WebhookPayload =
  | { type: 'INSERT'; table: 'matches'; record: MatchRecord }
  | { type: 'INSERT'; table: 'messages'; record: MessageRecord }
  | { type: 'INSERT'; table: 'dm_messages'; record: DmMessageRecord }
  | { type: 'INSERT'; table: 'session_polls'; record: PollRecord }
  | { type: 'INSERT'; table: 'swipes'; record: SwipeRecord }
  | { type: 'INSERT'; table: 'character_likes'; record: CharacterLikeRecord }
  | { type: 'INSERT'; table: 'session_poll_proposals'; record: ProposalRecord }
  | { type: 'INSERT'; table: 'session_poll_votes'; record: PollVoteRecord }
  | { type: 'INSERT'; table: 'sessions'; record: SessionRecord }
  | { type: 'INSERT'; table: 'reports'; record: ReportRecord };

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { url: string };
  sound: 'default';
  channelId: 'default';
};

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_SECRET_KEY')!);

function messagePreview(record: { body: string | null; kind: MessageRecord['kind'] }): string {
  if (record.kind === 'gif') return 'ha enviado un GIF 🎞️';
  if (record.kind === 'sticker') return `ha enviado ${record.body ?? 'un sticker'}`;
  if (record.kind === 'roll') return record.body ?? 'ha tirado los dados 🎲';
  if (record.kind === 'image') return 'ha enviado una foto 📷';
  const body = (record.body ?? '').trim();
  return body.length > 120 ? `${body.slice(0, 117)}…` : body;
}

/** Mensajes para un match: al jugador y al GM, cada uno con su texto. */
async function buildForMatch(record: MatchRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  const { data: group } = await supabase
    .from('groups')
    .select('name, owner_id')
    .eq('id', record.group_id)
    .single();
  const { data: player } = await supabase
    .from('profiles')
    .select('alias')
    .eq('id', record.user_id)
    .single();
  if (!group) return new Map();

  const url = `/groups/${record.group_id}`;
  const out = new Map<string, { title: string; body: string; url: string }>();
  out.set(record.user_id, {
    title: '🤝 ¡Match!',
    body: `Te has unido a «${group.name}». Ya tienes su chat de mesa en la app.`,
    url,
  });
  out.set(group.owner_id, {
    title: '🤝 ¡Match en tu mesa!',
    body: `${player?.alias ?? 'Alguien'} se ha unido a «${group.name}».`,
    url,
  });
  return out;
}

/** Mensajes para un mensaje de chat: a todos los miembros menos el emisor. */
async function buildForMessage(record: MessageRecord): Promise<Map<string, { title: string; body: string; url: string; tag?: string }>> {
  const [{ data: group }, { data: sender }, { data: members }] = await Promise.all([
    supabase.from('groups').select('name').eq('id', record.group_id).single(),
    supabase.from('profiles').select('alias').eq('id', record.sender_id).single(),
    supabase.from('group_members').select('user_id').eq('group_id', record.group_id),
  ]);
  if (!group || !members) return new Map();

  const url = `/groups/${record.group_id}/chat`;
  const title = `💬 ${group.name}`;
  const body = `${sender?.alias ?? 'Alguien'}: ${messagePreview(record)}`;
  // tag: el service worker agrupa los mensajes seguidos del mismo chat en
  // UNA notificación con contador (estilo WhatsApp) en vez de apilarlas
  const tag = `chat-${record.group_id}`;
  const out = new Map<string, { title: string; body: string; url: string; tag?: string }>();
  for (const member of members) {
    if (member.user_id !== record.sender_id) out.set(member.user_id, { title, body, url, tag });
  }
  return out;
}

/** Mensaje directo: solo al otro participante del hilo. */
async function buildForDm(record: DmMessageRecord): Promise<Map<string, { title: string; body: string; url: string; tag?: string }>> {
  const [{ data: thread }, { data: sender }] = await Promise.all([
    supabase.from('dm_threads').select('user_lo, user_hi').eq('id', record.thread_id).single(),
    supabase.from('profiles').select('alias').eq('id', record.sender_id).single(),
  ]);
  if (!thread) return new Map();

  const recipient = thread.user_lo === record.sender_id ? thread.user_hi : thread.user_lo;
  const out = new Map<string, { title: string; body: string; url: string; tag?: string }>();
  out.set(recipient, {
    title: `💬 ${sender?.alias ?? 'Alguien'}`,
    body: messagePreview(record),
    url: `/dm/${record.thread_id}`,
    tag: `dm-${record.thread_id}`,
  });
  return out;
}

/** Votación nueva: a toda la mesa menos quien la creó. */
async function buildForPoll(record: PollRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  const [{ data: group }, { data: creator }, { data: members }] = await Promise.all([
    supabase.from('groups').select('name').eq('id', record.group_id).single(),
    supabase.from('profiles').select('alias').eq('id', record.created_by).single(),
    supabase.from('group_members').select('user_id').eq('group_id', record.group_id),
  ]);
  if (!group || !members) return new Map();

  const url = `/groups/${record.group_id}/schedule`;
  const title = `🗳️ Votación en «${group.name}»`;
  const body = `${creator?.alias ?? 'Alguien'} propone fechas${record.title ? ` — ${record.title}` : ''}. Vota cuándo puedes jugar.`;
  const out = new Map<string, { title: string; body: string; url: string }>();
  for (const member of members) {
    if (member.user_id !== record.created_by) out.set(member.user_id, { title, body, url });
  }
  return out;
}

/**
 * Like en el feed. Si el like cierra un match (ya existe el del otro lado),
 * no avisa: el push de match llega solo. El like de mesa a jugador no revela
 * qué mesa es — descubrirlo es la pestaña Likes (gancho premium).
 */
async function buildForSwipe(record: SwipeRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  if (record.direction !== 'like') return new Map();

  const { data: reciprocal } = await supabase
    .from('swipes')
    .select('id')
    .eq('user_id', record.user_id)
    .eq('group_id', record.group_id)
    .eq('origin', record.origin === 'user' ? 'group' : 'user')
    .eq('direction', 'like')
    .maybeSingle();
  if (reciprocal) return new Map();

  const out = new Map<string, { title: string; body: string; url: string }>();
  if (record.origin === 'user') {
    // jugador → mesa: el GM tiene candidato nuevo
    const [{ data: group }, { data: player }] = await Promise.all([
      supabase.from('groups').select('name, owner_id').eq('id', record.group_id).single(),
      supabase.from('profiles').select('alias').eq('id', record.user_id).single(),
    ]);
    if (!group) return out;
    out.set(group.owner_id, {
      title: `⚔️ Candidato para «${group.name}»`,
      body: `${player?.alias ?? 'Alguien'} quiere unirse a tu mesa.`,
      url: `/groups/${record.group_id}/candidates`,
    });
  } else {
    // mesa → jugador: teaser sin nombre
    out.set(record.user_id, {
      title: '💜 ¡Le gustas a una mesa!',
      body: 'Descubre cuál en tu pestaña de Encuentros 🔭.',
      url: '/likes',
    });
  }
  return out;
}

/** Like a un personaje: a su dueño (sin nombrar al fan). */
async function buildForCharacterLike(record: CharacterLikeRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  const { data: character } = await supabase
    .from('characters')
    .select('name, user_id')
    .eq('id', record.character_id)
    .single();
  if (!character || character.user_id === record.liker_id) return new Map();

  const out = new Map<string, { title: string; body: string; url: string }>();
  out.set(character.user_id, {
    title: `💜 A alguien le gusta ${character.name}`,
    body: 'Tu vitrina está haciendo su trabajo.',
    url: `/characters/${record.character_id}`,
  });
  return out;
}

function formatDateEs(iso: string, timezone?: string | null): string {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || 'Europe/Madrid',
  });
}

/** Fecha extra propuesta por un jugador: a la bandeja del GM. */
async function buildForProposal(record: ProposalRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  const [{ data: poll }, { data: proposer }] = await Promise.all([
    supabase
      .from('session_polls')
      .select('group_id, title, groups(name, owner_id, timezone)')
      .eq('id', record.poll_id)
      .single(),
    supabase.from('profiles').select('alias').eq('id', record.proposer_id).single(),
  ]);
  const groups = (
    poll as { groups?: { name: string; owner_id: string; timezone: string | null } | null } | null
  )?.groups;
  if (!poll || !groups) return new Map();

  const out = new Map<string, { title: string; body: string; url: string }>();
  out.set(groups.owner_id, {
    title: `🙋 Fecha propuesta en «${groups.name}»`,
    body: `${proposer?.alias ?? 'Alguien'} propone ${formatDateEs(record.starts_at, groups.timezone)}. Añádela o recházala.`,
    url: `/groups/${poll.group_id}/schedule`,
  });
  return out;
}

/** Voto nuevo: si con este ya ha votado TODA la mesa, aviso al GM. */
async function buildForPollVote(record: PollVoteRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  const { data: option } = await supabase
    .from('session_poll_options')
    .select('poll_id, session_polls(group_id, title, status, groups(name, owner_id))')
    .eq('id', record.option_id)
    .single();
  const poll = (option as {
    poll_id: string;
    session_polls: {
      group_id: string;
      title: string | null;
      status: string;
      groups: { name: string; owner_id: string } | null;
    } | null;
  } | null)?.session_polls;
  if (!option || !poll || !poll.groups || poll.status !== 'open') return new Map();

  const [{ data: members }, { data: options }] = await Promise.all([
    supabase.from('group_members').select('user_id').eq('group_id', poll.group_id),
    supabase
      .from('session_poll_options')
      .select('id, session_poll_votes(user_id)')
      .eq('poll_id', (option as { poll_id: string }).poll_id),
  ]);
  if (!members || !options) return new Map();

  const voters = new Set<string>();
  for (const opt of options as { session_poll_votes: { user_id: string }[] }[]) {
    for (const vote of opt.session_poll_votes) voters.add(vote.user_id);
  }
  // ¿han votado todos los miembros (el GM incluido si vota)? menos el GM,
  // que es quien decide: con jugadores al completo ya puede cerrar
  const players = members.map((m) => m.user_id).filter((uid) => uid !== poll.groups!.owner_id);
  const everyoneVoted = players.length > 0 && players.every((uid) => voters.has(uid));
  if (!everyoneVoted) return new Map();

  const out = new Map<string, { title: string; body: string; url: string }>();
  out.set(poll.groups.owner_id, {
    title: '🗳️ ¡Todos han votado!',
    body: `La mesa al completo votó en «${poll.title ?? '¿Cuándo jugamos?'}» de ${poll.groups.name}. Entra y fija la fecha.`,
    url: `/groups/${poll.group_id}/schedule`,
  });
  return out;
}

/** Partida fijada: a toda la mesa menos quien la fijó. */
async function buildForSession(record: SessionRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from('groups').select('name, timezone').eq('id', record.group_id).single(),
    supabase.from('group_members').select('user_id').eq('group_id', record.group_id),
  ]);
  if (!group || !members) return new Map();

  const url = `/groups/${record.group_id}/schedule`;
  const title = `📅 Partida fijada en «${group.name}»`;
  const body = `${formatDateEs(record.starts_at, group.timezone)}${record.title ? ` — ${record.title}` : ''}`;
  const out = new Map<string, { title: string; body: string; url: string }>();
  for (const member of members) {
    if (member.user_id !== record.created_by) out.set(member.user_id, { title, body, url });
  }
  return out;
}

/** Reporte nuevo: aviso a todos los moderadores (profiles.is_moderator). */
async function buildForReport(record: ReportRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  const [{ data: moderators }, { data: reporter }] = await Promise.all([
    supabase.from('profiles').select('id').eq('is_moderator', true),
    supabase.from('profiles').select('alias').eq('id', record.reporter_id).single(),
  ]);
  if (!moderators || moderators.length === 0) return new Map();

  let target = 'algo';
  let url = '/';
  if (record.reported_group_id) {
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', record.reported_group_id)
      .single();
    target = `la mesa «${group?.name ?? '?'}»`;
    url = `/groups/${record.reported_group_id}`;
  } else if (record.reported_user_id) {
    const { data: reported } = await supabase
      .from('profiles')
      .select('alias')
      .eq('id', record.reported_user_id)
      .single();
    target = reported?.alias ?? 'un usuario';
    url = `/players/${record.reported_user_id}`;
  }

  const out = new Map<string, { title: string; body: string; url: string }>();
  for (const moderator of moderators) {
    out.set(moderator.id, {
      title: '🚨 Reporte nuevo',
      body: `${reporter?.alias ?? 'Alguien'} reporta a ${target}: ${record.reason}`,
      url,
    });
  }
  return out;
}

async function sendAll(byUser: Map<string, { title: string; body: string; url: string }>) {
  if (byUser.size === 0) return { sent: 0 };

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token, user_id')
    .in('user_id', [...byUser.keys()]);
  if (!tokens || tokens.length === 0) return { sent: 0 };

  const pushes: PushMessage[] = tokens.map((row) => {
    const content = byUser.get(row.user_id)!;
    return {
      to: row.token,
      title: content.title,
      body: content.body,
      data: { url: content.url },
      sound: 'default',
      channelId: 'default',
    };
  });

  const dead: string[] = [];
  // La API acepta hasta 100 por petición
  for (let i = 0; i < pushes.length; i += 100) {
    const chunk = pushes.slice(i, i + 100);
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (!response.ok) {
      console.error(`Expo Push ${response.status}: ${await response.text()}`);
      continue;
    }
    const { data: tickets } = await response.json();
    tickets?.forEach((ticket: { status: string; details?: { error?: string } }, index: number) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        dead.push(chunk[index].to);
      }
    });
  }

  if (dead.length > 0) {
    await supabase.from('push_tokens').delete().in('token', dead);
  }
  return { sent: pushes.length - dead.length };
}

/** Web Push a los navegadores suscritos de esos usuarios (iOS/web). */
async function sendAllWeb(byUser: Map<string, { title: string; body: string; url: string; tag?: string }>) {
  if (!VAPID_PRIVATE_KEY || byUser.size === 0) return { webSent: 0 };
  const { data: subs } = await supabase
    .from('web_push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', [...byUser.keys()]);
  let webSent = 0;
  const dead: string[] = [];
  for (const sub of subs ?? []) {
    const content = byUser.get(sub.user_id);
    if (!content) continue;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(content)
      );
      webSent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410 = suscripción caducada o revocada
      if (status === 404 || status === 410) dead.push(sub.id);
      else console.error(`web push falló (${status}): ${err}`);
    }
  }
  if (dead.length > 0) {
    await supabase.from('web_push_subscriptions').delete().in('id', dead);
  }
  return { webSent };
}

Deno.serve(async (request) => {
  if (request.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  try {
    const payload = (await request.json()) as WebhookPayload;
    if (payload.type !== 'INSERT') return Response.json({ skipped: true });

    const byUser =
      payload.table === 'matches'
        ? await buildForMatch(payload.record)
        : payload.table === 'messages'
          ? await buildForMessage(payload.record)
          : payload.table === 'dm_messages'
            ? await buildForDm(payload.record)
            : payload.table === 'session_polls'
              ? await buildForPoll(payload.record)
              : payload.table === 'swipes'
                ? await buildForSwipe(payload.record)
                : payload.table === 'character_likes'
                  ? await buildForCharacterLike(payload.record)
                  : payload.table === 'session_poll_proposals'
                    ? await buildForProposal(payload.record)
                    : payload.table === 'session_poll_votes'
                      ? await buildForPollVote(payload.record)
                      : payload.table === 'sessions'
                        ? await buildForSession(payload.record)
                        : payload.table === 'reports'
                          ? await buildForReport(payload.record)
                          : new Map<string, { title: string; body: string; url: string }>();

    const result = await sendAll(byUser);
    const webResult = await sendAllWeb(byUser);
    return Response.json({ ...result, ...webResult });
  } catch (error) {
    console.error(error);
    // 200 igualmente: no queremos que Supabase reintente en bucle
    return Response.json({ error: String(error) });
  }
});
