// Edge Function: discord-cleanup
// Database Webhook en DELETE sobre `groups`: al borrar una mesa, borra sus
// canales de Discord (texto y voz) para que el servidor no acumule huérfanos
// (issue #32, ciclo de vida de canales).
//
// Desplegar con Verify JWT DESACTIVADO; auth = cabecera x-webhook-secret.
// Secrets: DISCORD_BOT_TOKEN, WEBHOOK_SECRET.

const DISCORD_API = 'https://discord.com/api/v10';

type WebhookPayload = {
  type: 'DELETE';
  table: string;
  old_record: {
    name?: string;
    discord_channel_id: string | null;
    discord_voice_channel_id: string | null;
  } | null;
};

async function deleteChannel(channelId: string) {
  const response = await fetch(`${DISCORD_API}/channels/${channelId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bot ${Deno.env.get('DISCORD_BOT_TOKEN')}` },
  });
  // 404 = ya no existe (borrado a mano): no es un error
  if (!response.ok && response.status !== 404) {
    throw new Error(`Discord DELETE channel → ${response.status}: ${await response.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  if (payload.type !== 'DELETE' || payload.table !== 'groups') {
    return new Response('Ignored', { status: 200 });
  }

  const record = payload.old_record;
  const deleted: string[] = [];
  for (const channelId of [record?.discord_channel_id, record?.discord_voice_channel_id]) {
    if (!channelId) continue;
    try {
      await deleteChannel(channelId);
      deleted.push(channelId);
    } catch (error) {
      console.error(`no se pudo borrar el canal ${channelId}: ${error}`);
    }
  }

  console.log(`mesa borrada («${record?.name ?? '?'}»): ${deleted.length} canal(es) eliminados`);
  return new Response(JSON.stringify({ deleted }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
