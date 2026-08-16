// Edge Function: push-reminders
// Invocada por cron (cada 15 min) vía pg_cron + pg_net — SQL en la migración 00023.
// Envía recordatorios de sesión POR PUSH (Expo) a los miembros de cada mesa:
// uno cuando faltan <24 h y otro cuando falta <1 h. Es el sustituto de
// discord-reminders mientras Discord está apagado (y conviven si se reactiva:
// cada canal marca sus propios flags push_reminded_*).
//
// Además, un tercer aviso "hoy toca partida" cuando empieza el día
// calendario de la sesión en la timezone de la mesa (migr. 00029) — el
// mismo momento en que el histórico de la mesa se abre para escribir.
//
// Y un cuarto aviso post-sesión (migr. 00055): unas horas después del
// inicio pregunta "¿qué tal fue?" para que la mesa confirme que se jugó
// (XP por quórum), valore compañeros y escriba el histórico.
//
// Además de Expo (APK), envía Web Push a los navegadores suscritos en
// web_push_subscriptions (migr. 00024) — el canal de los usuarios de iOS.
//
// Desplegar con Verify JWT DESACTIVADO; auth = cabecera x-webhook-secret.
// Secrets: WEBHOOK_SECRET, SB_SECRET_KEY, VAPID_PRIVATE_KEY (los mismos
// que push-notify; sin la clave VAPID el web push se omite).

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

type SessionRow = {
  id: string;
  group_id: string;
  starts_at: string;
  title: string | null;
  push_reminded_24h: boolean;
  push_reminded_1h: boolean;
  groups: { name: string; timezone: string | null } | null;
};

/** «Europe/Madrid» → «Madrid», «America/Mexico_City» → «Mexico City» */
function tzLabel(tz: string): string {
  return (tz.split('/').pop() ?? tz).replace(/_/g, ' ');
}

type DayStartRow = {
  id: string;
  group_id: string;
  starts_at: string;
  title: string | null;
  group_name: string | null;
};

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { url: string };
  sound: 'default';
  channelId: 'default';
};

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_SECRET_KEY')!);

/** Envía pushes en lotes de 100 y purga tokens muertos (mismo patrón que push-notify). */
async function sendPushes(pushes: PushMessage[]) {
  const dead: string[] = [];
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
  return pushes.length - dead.length;
}

/** Tokens Expo de todos los miembros de la mesa (y sus ids, para el web push). */
async function memberTokens(groupId: string): Promise<{ tokens: string[]; userIds: string[] }> {
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);
  if (!members || members.length === 0) return { tokens: [], userIds: [] };
  const userIds = members.map((m) => m.user_id);
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds);
  return { tokens: (tokens ?? []).map((t) => t.token), userIds };
}

/** Web Push del mismo aviso a los navegadores suscritos de esos usuarios. */
async function sendWebPushes(
  userIds: string[],
  content: { title: string; body: string; url: string }
): Promise<number> {
  if (!VAPID_PRIVATE_KEY || userIds.length === 0) return 0;
  const { data: subs } = await supabase
    .from('web_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  let sent = 0;
  const dead: string[] = [];
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(content)
      );
      sent++;
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
  return sent;
}

Deno.serve(async (request) => {
  if (request.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  const now = Date.now();
  const in24h = new Date(now + 24 * 3600_000).toISOString();

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, group_id, starts_at, title, push_reminded_24h, push_reminded_1h, groups(name, timezone)')
    .gte('starts_at', new Date(now).toISOString())
    .lte('starts_at', in24h)
    .or('push_reminded_24h.eq.false,push_reminded_1h.eq.false');
  if (error) {
    console.error(`error consultando sesiones: ${JSON.stringify(error)}`);
    return new Response('DB error', { status: 500 });
  }

  let sent = 0;
  for (const row of (sessions ?? []) as unknown as SessionRow[]) {
    const groupName = row.groups?.name ?? 'tu mesa';
    const hoursLeft = (new Date(row.starts_at).getTime() - now) / 3600_000;
    const sessionTitle = row.title ? ` — ${row.title}` : '';

    let content: { title: string; body: string } | null = null;
    let update: Partial<SessionRow> | null = null;
    if (hoursLeft <= 1 && !row.push_reminded_1h) {
      content = {
        title: `«${groupName}» empieza en menos de una hora`,
        body: `Preparad los dados 🎲${sessionTitle}`,
      };
      update = { push_reminded_1h: true, push_reminded_24h: true };
    } else if (!row.push_reminded_24h) {
      // la hora se expresa en la timezone de la MESA, no en un Madrid fijo
      const tz = row.groups?.timezone || 'Europe/Madrid';
      const when = new Date(row.starts_at).toLocaleString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz,
      });
      content = {
        title: `Sesión de «${groupName}»`,
        body: `${when} (hora de ${tzLabel(tz)})${sessionTitle}. Confirma tu asistencia`,
      };
      update = { push_reminded_24h: true };
    }
    if (!content || !update) continue;

    try {
      const url = `/groups/${row.group_id}`;
      const { tokens, userIds } = await memberTokens(row.group_id);
      const pushes: PushMessage[] = tokens.map((token) => ({
        to: token,
        title: content!.title,
        body: content!.body,
        data: { url },
        sound: 'default',
        channelId: 'default',
      }));
      if (pushes.length > 0) sent += await sendPushes(pushes);
      sent += await sendWebPushes(userIds, { ...content!, url });
      // marcamos aunque no haya destinatarios: la ventana pasó, no reintentamos en bucle
      await supabase.from('sessions').update(update).eq('id', row.id);
    } catch (err) {
      console.error(`fallo recordando sesión ${row.id}: ${err}`);
    }
  }

  // Aviso "hoy toca partida": dia calendario de la sesion (timezone de la
  // mesa) distinto de las horas absolutas de arriba, por eso es una
  // consulta y un flag aparte (sessions_starting_today, migr. 00029).
  const { data: startingToday, error: dayStartError } = await supabase.rpc(
    'sessions_starting_today'
  );
  if (dayStartError) {
    console.error(`error consultando sessions_starting_today: ${JSON.stringify(dayStartError)}`);
  } else {
    for (const row of (startingToday ?? []) as DayStartRow[]) {
      const groupName = row.group_name ?? 'tu mesa';
      const sessionTitle = row.title ? ` — ${row.title}` : '';
      const content = {
        title: `🎲 Hoy toca «${groupName}»`,
        body: `El histórico de la mesa se abre para escribir${sessionTitle}.`,
      };
      try {
        const url = `/groups/${row.group_id}/journal`;
        const { tokens, userIds } = await memberTokens(row.group_id);
        const pushes: PushMessage[] = tokens.map((token) => ({
          to: token,
          title: content.title,
          body: content.body,
          data: { url },
          sound: 'default',
          channelId: 'default',
        }));
        if (pushes.length > 0) sent += await sendPushes(pushes);
        sent += await sendWebPushes(userIds, { ...content, url });
        // marcamos aunque no haya destinatarios: el dia ya empezo, no reintentamos en bucle
        await supabase.from('sessions').update({ push_reminded_day_start: true }).eq('id', row.id);
      } catch (err) {
        console.error(`fallo avisando inicio de dia de sesión ${row.id}: ${err}`);
      }
    }
  }

  // Aviso post-sesión: unas horas después del inicio (una sesión típica
  // dura 3-5 h), toda la mesa recibe el "¿qué tal fue?" que enlaza a la
  // pantalla de la mesa, donde viven confirmar la sesión y valorar. La
  // ventana de 24 h evita rescatar sesiones viejas si el cron estuvo caído.
  const POST_SESSION_HOURS = 4;
  const { data: finishedSessions, error: postError } = await supabase
    .from('sessions')
    .select('id, group_id, starts_at, title, groups(name)')
    .eq('push_reminded_post', false)
    .lte('starts_at', new Date(now - POST_SESSION_HOURS * 3600_000).toISOString())
    .gte('starts_at', new Date(now - 24 * 3600_000).toISOString());
  if (postError) {
    // migración 00055 sin aplicar: sin aviso post-sesión
    console.log(`aviso post-sesión no disponible: ${postError.message}`);
  } else {
    for (const row of (finishedSessions ?? []) as unknown as {
      id: string;
      group_id: string;
      starts_at: string;
      title: string | null;
      groups: { name: string } | null;
    }[]) {
      const groupName = row.groups?.name ?? 'tu mesa';
      const sessionTitle = row.title ? ` — ${row.title}` : '';
      const content = {
        title: `🎲 ¿Qué tal fue la sesión de «${groupName}»?`,
        body: `Confirma que se jugó, valora a tus compañeros y deja tu crónica en el histórico${sessionTitle}.`,
      };
      try {
        const url = `/groups/${row.group_id}`;
        const { tokens, userIds } = await memberTokens(row.group_id);
        const pushes: PushMessage[] = tokens.map((token) => ({
          to: token,
          title: content.title,
          body: content.body,
          data: { url },
          sound: 'default',
          channelId: 'default',
        }));
        if (pushes.length > 0) sent += await sendPushes(pushes);
        sent += await sendWebPushes(userIds, { ...content, url });
        // marcamos aunque no haya destinatarios: la sesión ya pasó, no reintentamos en bucle
        await supabase.from('sessions').update({ push_reminded_post: true }).eq('id', row.id);
      } catch (err) {
        console.error(`fallo con el aviso post-sesión ${row.id}: ${err}`);
      }
    }
  }

  // Aviso al GM: votaciones cuyo plazo de cierre venció (migr. 00030) —
  // le toca entrar, ver el resultado y fijar la fecha ganadora.
  const { data: duePolls, error: pollsError } = await supabase
    .from('session_polls')
    .select('id, group_id, title, groups(name, owner_id)')
    .eq('status', 'open')
    .eq('deadline_notified', false)
    .not('closes_at', 'is', null)
    .lte('closes_at', new Date(now).toISOString());
  if (pollsError) {
    // migración 00030 sin aplicar: sin deadlines que vigilar
    console.log(`deadlines de votaciones no disponibles: ${pollsError.message}`);
  } else {
    for (const poll of (duePolls ?? []) as unknown as {
      id: string;
      group_id: string;
      title: string | null;
      groups: { name: string; owner_id: string } | null;
    }[]) {
      if (!poll.groups) continue;
      const content = {
        title: 'Votación lista para cerrar',
        body: `«${poll.title ?? '¿Cuándo jugamos?'}» de ${poll.groups.name} llegó a su plazo. Entra y fija la fecha.`,
      };
      try {
        const url = `/groups/${poll.group_id}/schedule`;
        const ownerId = poll.groups.owner_id;
        const { data: tokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', ownerId);
        const pushes: PushMessage[] = (tokens ?? []).map((t) => ({
          to: t.token,
          title: content.title,
          body: content.body,
          data: { url },
          sound: 'default',
          channelId: 'default',
        }));
        if (pushes.length > 0) sent += await sendPushes(pushes);
        sent += await sendWebPushes([ownerId], { ...content, url });
        await supabase
          .from('session_polls')
          .update({ deadline_notified: true })
          .eq('id', poll.id);
      } catch (err) {
        console.error(`fallo avisando deadline de votación ${poll.id}: ${err}`);
      }
    }
  }

  console.log(`recordatorios push enviados: ${sent}`);
  return Response.json({ sent });
});
