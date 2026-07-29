// Edge Function: push-reminders
// Invocada por cron (cada 15 min) vía pg_cron + pg_net — SQL en la migración 00023.
// Envía recordatorios de sesión POR PUSH (Expo) a los miembros de cada mesa:
// uno cuando faltan <24 h y otro cuando falta <1 h. Es el sustituto de
// discord-reminders mientras Discord está apagado (y conviven si se reactiva:
// cada canal marca sus propios flags push_reminded_*).
//
// Desplegar con Verify JWT DESACTIVADO; auth = cabecera x-webhook-secret.
// Secrets: WEBHOOK_SECRET, SB_SECRET_KEY (los mismos que push-notify).

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

type SessionRow = {
  id: string;
  group_id: string;
  starts_at: string;
  title: string | null;
  push_reminded_24h: boolean;
  push_reminded_1h: boolean;
  groups: { name: string } | null;
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

/** Tokens de todos los miembros de la mesa. */
async function memberTokens(groupId: string): Promise<string[]> {
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);
  if (!members || members.length === 0) return [];
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', members.map((m) => m.user_id));
  return (tokens ?? []).map((t) => t.token);
}

Deno.serve(async (request) => {
  if (request.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  const now = Date.now();
  const in24h = new Date(now + 24 * 3600_000).toISOString();

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, group_id, starts_at, title, push_reminded_24h, push_reminded_1h, groups(name)')
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
        title: `⏰ ¡«${groupName}» empieza en menos de una hora!`,
        body: `Preparad los dados 🎲${sessionTitle}`,
      };
      update = { push_reminded_1h: true, push_reminded_24h: true };
    } else if (!row.push_reminded_24h) {
      const when = new Date(row.starts_at).toLocaleString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid',
      });
      content = {
        title: `📅 Sesión de «${groupName}»`,
        body: `${when} (hora de Madrid)${sessionTitle}. ¡Confirma tu asistencia!`,
      };
      update = { push_reminded_24h: true };
    }
    if (!content || !update) continue;

    try {
      const tokens = await memberTokens(row.group_id);
      const pushes: PushMessage[] = tokens.map((token) => ({
        to: token,
        title: content!.title,
        body: content!.body,
        data: { url: `/groups/${row.group_id}` },
        sound: 'default',
        channelId: 'default',
      }));
      if (pushes.length > 0) sent += await sendPushes(pushes);
      // marcamos aunque no haya tokens: la ventana pasó, no reintentamos en bucle
      await supabase.from('sessions').update(update).eq('id', row.id);
    } catch (err) {
      console.error(`fallo recordando sesión ${row.id}: ${err}`);
    }
  }

  console.log(`recordatorios push enviados: ${sent}`);
  return Response.json({ sent });
});
