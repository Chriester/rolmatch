// Edge Function: discord-match
// Disparada por un Database Webhook en INSERT sobre `matches` (§6 del PRD).
// Crea un canal privado en el servidor comunitario de Discord para el
// jugador y el GM, publica el mensaje de presentación y guarda el
// channel_id en el match.
//
// Secrets necesarios (supabase secrets set / dashboard):
//   DISCORD_BOT_TOKEN   token del bot de la aplicación de Discord
//   DISCORD_GUILD_ID    id del servidor comunitario donde crear canales
//   WEBHOOK_SECRET      valor compartido con el webhook (cabecera x-webhook-secret)
//   SB_SECRET_KEY       clave sb_secret_... (Project Settings → API Keys). Se usa en
//                       lugar del SERVICE_ROLE_KEY legado, que es un JWT y puede dar
//                       PGRST303 "JWT issued at future" por desfase de reloj.
// SUPABASE_URL la inyecta Supabase automáticamente.
//
// Desplegar con: npx supabase functions deploy discord-match --no-verify-jwt
// (el webhook de la DB no envía JWT; la autenticación es el WEBHOOK_SECRET)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DISCORD_API = 'https://discord.com/api/v10';

type WebhookPayload = {
  type: 'INSERT';
  table: string;
  record: { id: string; user_id: string; group_id: string };
};

async function discord(path: string, method: string, body?: unknown) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${Deno.env.get('DISCORD_BOT_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Discord ${method} ${path} → ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  console.log('payload recibido:', JSON.stringify(payload));
  if (payload.type !== 'INSERT' || payload.table !== 'matches') {
    console.log(`ignorado: type=${payload.type} table=${payload.table}`);
    return new Response('Ignored', { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { user_id, group_id, id: matchId } = payload.record;

  const [playerResult, groupResult] = await Promise.all([
    supabase.from('profiles').select('alias, discord_id').eq('id', user_id).single(),
    supabase
      .from('groups')
      .select('name, discord_invite_url, owner_id, profiles!groups_owner_id_fkey(alias, discord_id)')
      .eq('id', group_id)
      .single(),
  ]);
  const player = playerResult.data;
  const group = groupResult.data;
  if (!player || !group) {
    console.error(
      `match sin datos: player=${JSON.stringify(playerResult.error ?? player)} ` +
        `group=${JSON.stringify(groupResult.error ?? group)}`
    );
    return new Response('Match sin datos', { status: 200 });
  }
  console.log(`datos ok: player=${player.alias} (${player.discord_id}) group=${group.name}`);

  const owner = group.profiles as unknown as { alias: string; discord_id: string | null } | null;
  const guildId = Deno.env.get('DISCORD_GUILD_ID')!;

  // Canal privado: oculto para @everyone, visible para jugador y GM (si
  // tienen Discord vinculado) y para el propio bot.
  const VIEW_CHANNEL_AND_HISTORY = String(0x400 | 0x10000 | 0x800); // ver + historial + escribir
  const overwrites = [
    { id: guildId, type: 0, deny: String(0x400) }, // @everyone: no ver
    ...[player.discord_id, owner?.discord_id]
      .filter((d): d is string => Boolean(d))
      .map((discordId) => ({ id: discordId, type: 1, allow: VIEW_CHANNEL_AND_HISTORY })),
  ];

  // Nombre de canal estilo Discord: minúsculas, sin acentos (NFD + quitar
  // marcas diacríticas U+0300-U+036F), solo [a-z0-9-]
  const channelName = `match-${group.name}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);

  // El canal de Discord y el push son independientes: si Discord falla,
  // el push sale igualmente (y viceversa).
  let channelId: string | null = null;
  try {
    console.log(`creando canal "${channelName}" en guild ${guildId}…`);
    const channel = await discord(`/guilds/${guildId}/channels`, 'POST', {
      name: channelName,
      type: 0,
      topic: `Match de RolMatch: ${player.alias} × ${group.name}`,
      permission_overwrites: overwrites,
    });
    channelId = channel.id as string;
    console.log(`canal creado: ${channelId}`);

    const mentions = [player.discord_id, owner?.discord_id]
      .filter(Boolean)
      .map((d) => `<@${d}>`)
      .join(' y ');
    const inviteLine = group.discord_invite_url
      ? `\nLa mesa también tiene su propio servidor: ${group.discord_invite_url}`
      : '';

    await discord(`/channels/${channelId}/messages`, 'POST', {
      content:
        `🎲 **¡Match!** ${mentions}\n` +
        `**${player.alias}** y la mesa **${group.name}** habéis coincidido en RolMatch. ` +
        `Este canal es vuestro para presentaros y cuadrar la primera sesión.${inviteLine}`,
    });

    await supabase.from('matches').update({ discord_channel_id: channelId }).eq('id', matchId);
  } catch (error) {
    console.error(`fallo en Discord (el push continúa): ${error}`);
  }

  // Expo Push a los dispositivos nativos de ambas partes (§8.6). En web no
  // hay push: el aviso es la mención del canal de Discord.
  try {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', [user_id, group.owner_id]);
    if (tokens && tokens.length > 0) {
      const messages = tokens.map((t: { token: string }) => ({
        to: t.token,
        title: '🎲 ¡Match!',
        body: `${player.alias} × ${group.name}. Abrid Discord para presentaros.`,
      }));
      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      console.log(`push enviado a ${tokens.length} dispositivo(s): ${pushResponse.status}`);
    } else {
      console.log('sin tokens de push registrados para este match');
    }
  } catch (error) {
    console.error(`fallo enviando push: ${error}`);
  }

  return new Response(JSON.stringify({ channel_id: channelId }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
