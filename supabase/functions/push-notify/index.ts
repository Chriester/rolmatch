// Edge Function: push-notify
// Envía notificaciones push (Expo Push API) a los móviles.
// Disparada por Database Webhooks en INSERT sobre `matches` y `messages`
// (una sola función para ambos: distingue por payload.table).
//
// - Match → avisa al jugador y al GM de la mesa.
// - Mensaje → avisa a los miembros de la mesa menos quien lo envía.
//
// Los tokens los registra la app en push_tokens (migr. 00003). El envío va a
// https://exp.host/--/api/v2/push/send (gratis); Expo lo entrega vía FCM, así
// que la APK necesita google-services.json + credenciales FCM V1 en EAS.
// Los tokens caducados (DeviceNotRegistered) se borran de la tabla.
//
// Secrets necesarios (Edge Functions → Secrets):
//   WEBHOOK_SECRET  valor compartido con el webhook (cabecera x-webhook-secret)
//   SB_SECRET_KEY   clave sb_secret_... (igual que discord-match)
// SUPABASE_URL la inyecta Supabase automáticamente.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

type MatchRecord = { id: string; user_id: string; group_id: string };
type MessageRecord = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string | null;
  kind: 'text' | 'gif' | 'sticker' | null;
};

type WebhookPayload =
  | { type: 'INSERT'; table: 'matches'; record: MatchRecord }
  | { type: 'INSERT'; table: 'messages'; record: MessageRecord };

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { url: string };
  sound: 'default';
  channelId: 'default';
};

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_SECRET_KEY')!);

function messagePreview(record: MessageRecord): string {
  if (record.kind === 'gif') return 'ha enviado un GIF 🎞️';
  if (record.kind === 'sticker') return `ha enviado ${record.body ?? 'un sticker'}`;
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
async function buildForMessage(record: MessageRecord): Promise<Map<string, { title: string; body: string; url: string }>> {
  const [{ data: group }, { data: sender }, { data: members }] = await Promise.all([
    supabase.from('groups').select('name').eq('id', record.group_id).single(),
    supabase.from('profiles').select('alias').eq('id', record.sender_id).single(),
    supabase.from('group_members').select('user_id').eq('group_id', record.group_id),
  ]);
  if (!group || !members) return new Map();

  const url = `/groups/${record.group_id}/chat`;
  const title = `💬 ${group.name}`;
  const body = `${sender?.alias ?? 'Alguien'}: ${messagePreview(record)}`;
  const out = new Map<string, { title: string; body: string; url: string }>();
  for (const member of members) {
    if (member.user_id !== record.sender_id) out.set(member.user_id, { title, body, url });
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
          : new Map<string, { title: string; body: string; url: string }>();

    const result = await sendAll(byUser);
    return Response.json(result);
  } catch (error) {
    console.error(error);
    // 200 igualmente: no queremos que Supabase reintente en bucle
    return Response.json({ error: String(error) });
  }
});
