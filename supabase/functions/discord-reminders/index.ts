// Edge Function: discord-reminders
// Invocada por cron (cada 15 min) vía pg_cron + pg_net — ver README §Bot.
// Envía recordatorios de sesión al canal de Discord de cada mesa:
// uno cuando faltan <24 h y otro cuando falta <1 h.
//
// Desplegar con Verify JWT DESACTIVADO; auth = cabecera x-webhook-secret.
// Secrets: DISCORD_BOT_TOKEN, WEBHOOK_SECRET, SB_SECRET_KEY.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DISCORD_API = 'https://discord.com/api/v10';

type SessionRow = {
  id: string;
  starts_at: string;
  title: string | null;
  reminded_24h: boolean;
  reminded_1h: boolean;
  groups: {
    name: string;
    discord_channel_id: string | null;
  } | null;
};

async function postMessage(channelId: string, content: string) {
  const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${Deno.env.get('DISCORD_BOT_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    throw new Error(`Discord POST message → ${response.status}: ${await response.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = Date.now();
  const in24h = new Date(now + 24 * 3600_000).toISOString();

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, starts_at, title, reminded_24h, reminded_1h, groups(name, discord_channel_id)')
    .gte('starts_at', new Date(now).toISOString())
    .lte('starts_at', in24h)
    .or('reminded_24h.eq.false,reminded_1h.eq.false');
  if (error) {
    console.error(`error consultando sesiones: ${JSON.stringify(error)}`);
    return new Response('DB error', { status: 500 });
  }

  let sent = 0;
  for (const row of (sessions ?? []) as unknown as SessionRow[]) {
    const channelId = row.groups?.discord_channel_id;
    if (!channelId) continue;

    const startsAt = new Date(row.starts_at);
    const hoursLeft = (startsAt.getTime() - now) / 3600_000;
    const when = startsAt.toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid',
    });
    const title = row.title ? ` — ${row.title}` : '';

    try {
      if (hoursLeft <= 1 && !row.reminded_1h) {
        await postMessage(
          channelId,
          `**La sesión de «${row.groups!.name}» empieza en menos de una hora**${title}\n@here preparad los dados 🎲`
        );
        await supabase
          .from('sessions')
          .update({ reminded_1h: true, reminded_24h: true })
          .eq('id', row.id);
        sent++;
      } else if (!row.reminded_24h) {
        await postMessage(
          channelId,
          `Recordatorio: sesión de **«${row.groups!.name}»** el ${when} (hora de Madrid)${title}.\nConfirmad asistencia por aquí`
        );
        await supabase.from('sessions').update({ reminded_24h: true }).eq('id', row.id);
        sent++;
      }
    } catch (err) {
      console.error(`fallo recordando sesión ${row.id}: ${err}`);
    }
  }

  console.log(`recordatorios enviados: ${sent}`);
  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
