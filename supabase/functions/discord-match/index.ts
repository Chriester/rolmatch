// Edge Function: discord-match
// Disparada por un Database Webhook en INSERT sobre `matches` (§6 del PRD).
//
// Modelo de canales: UN canal de texto + UNO de voz POR MESA (no por match).
// El primer match de una mesa crea sus canales privados en el servidor
// comunitario; los siguientes matches AÑADEN al jugador a los canales que ya
// existen. Así el servidor no se llena de canales huérfanos y cada mesa tiene
// su espacio (texto para coordinarse, voz para jugar).
//
// Secrets necesarios (Edge Functions → Secrets):
//   DISCORD_BOT_TOKEN   token del bot (misma app cuyo bot está en el servidor)
//   DISCORD_GUILD_ID    id del servidor comunitario
//   WEBHOOK_SECRET      valor compartido con el webhook (cabecera x-webhook-secret)
//   SB_SECRET_KEY       clave sb_secret_... (el SERVICE_ROLE_KEY legado es un JWT
//                       y puede dar PGRST303 por desfase de reloj)
// SUPABASE_URL la inyecta Supabase automáticamente.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const DISCORD_API = 'https://discord.com/api/v10';

// Permisos
const VIEW = 0x400;
const SEND = 0x800;
const HISTORY = 0x10000;
const CONNECT = 0x100000;
const SPEAK = 0x200000;
const TEXT_ALLOW = String(VIEW | SEND | HISTORY);
const VOICE_ALLOW = String(VIEW | CONNECT | SPEAK);

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
  // 204 No Content en algunos endpoints (p. ej. PUT permissions)
  if (response.status === 204) return null;
  return response.json();
}

function channelName(prefix: string, groupName: string) {
  return `${prefix}-${groupName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  console.log('payload recibido:', JSON.stringify(payload));
  if (payload.type !== 'INSERT' || payload.table !== 'matches') {
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
      .select(
        `name, discord_invite_url, owner_id, discord_channel_id, discord_voice_channel_id,
         profiles!groups_owner_id_fkey(alias, discord_id)`
      )
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
  console.log(`datos ok: player=${player.alias} group=${group.name}`);

  const owner = group.profiles as unknown as { alias: string; discord_id: string | null } | null;
  const guildId = Deno.env.get('DISCORD_GUILD_ID')!;

  let textChannelId = group.discord_channel_id as string | null;
  let voiceChannelId = group.discord_voice_channel_id as string | null;

  if (!textChannelId) {
    // Primer match de la mesa: crear sus canales privados (texto + voz)
    // con acceso para el GM y todos los miembros actuales con Discord.
    const { data: members } = await supabase
      .from('group_members')
      .select('profiles(discord_id)')
      .eq('group_id', group_id);
    const memberDiscordIds = (members ?? [])
      .map(
        (m: { profiles: unknown }) =>
          (m.profiles as { discord_id: string | null } | null)?.discord_id
      )
      .filter((d: string | null | undefined): d is string => Boolean(d));
    const allowedIds = [
      ...new Set([owner?.discord_id, player.discord_id, ...memberDiscordIds].filter(Boolean)),
    ] as string[];

    const textOverwrites = [
      { id: guildId, type: 0, deny: String(VIEW) },
      ...allowedIds.map((id) => ({ id, type: 1, allow: TEXT_ALLOW })),
    ];
    const voiceOverwrites = [
      { id: guildId, type: 0, deny: String(VIEW) },
      ...allowedIds.map((id) => ({ id, type: 1, allow: VOICE_ALLOW })),
    ];

    console.log(`creando canales de la mesa "${group.name}"…`);
    const textChannel = await discord(`/guilds/${guildId}/channels`, 'POST', {
      name: channelName('mesa', group.name),
      type: 0,
      topic: `Canal de la mesa «${group.name}» en RolMatch`,
      permission_overwrites: textOverwrites,
    });
    textChannelId = textChannel.id as string;

    try {
      const voiceChannel = await discord(`/guilds/${guildId}/channels`, 'POST', {
        name: channelName('voz', group.name),
        type: 2,
        permission_overwrites: voiceOverwrites,
      });
      voiceChannelId = voiceChannel.id as string;
    } catch (error) {
      console.error(`no se pudo crear el canal de voz (seguimos): ${error}`);
    }

    await supabase
      .from('groups')
      .update({ discord_channel_id: textChannelId, discord_voice_channel_id: voiceChannelId })
      .eq('id', group_id);
    console.log(`canales creados: texto=${textChannelId} voz=${voiceChannelId}`);
  } else if (player.discord_id) {
    // La mesa ya tiene canal: añadimos al nuevo jugador a texto y voz
    console.log(`añadiendo a ${player.alias} al canal existente ${textChannelId}`);
    await discord(`/channels/${textChannelId}/permissions/${player.discord_id}`, 'PUT', {
      type: 1,
      allow: TEXT_ALLOW,
      deny: '0',
    });
    if (voiceChannelId) {
      try {
        await discord(`/channels/${voiceChannelId}/permissions/${player.discord_id}`, 'PUT', {
          type: 1,
          allow: VOICE_ALLOW,
          deny: '0',
        });
      } catch (error) {
        console.error(`no se pudo añadir al canal de voz (seguimos): ${error}`);
      }
    }
  }

  // Mensaje de bienvenida en el canal de la mesa
  try {
    const mention = player.discord_id ? `<@${player.discord_id}>` : `**${player.alias}**`;
    const ownerMention = owner?.discord_id ? `<@${owner.discord_id}>` : (owner?.alias ?? 'GM');
    const inviteLine = group.discord_invite_url
      ? `\nLa mesa también tiene su propio servidor: ${group.discord_invite_url}`
      : '';
    await discord(`/channels/${textChannelId}/messages`, 'POST', {
      content:
        `🎲 **¡Match!** ${mention} se une a **${group.name}** (GM: ${ownerMention}). ` +
        `Presentaos y cuadrad la próxima sesión.${inviteLine}`,
    });
  } catch (error) {
    console.error(`no se pudo publicar la bienvenida: ${error}`);
  }

  await supabase.from('matches').update({ discord_channel_id: textChannelId }).eq('id', matchId);

  return new Response(JSON.stringify({ channel_id: textChannelId, voice_channel_id: voiceChannelId }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
