// Edge Function: discord-join
// Une automáticamente al usuario al servidor comunitario de Discord tras el
// login. El OAuth de la app pide el scope `guilds.join`, así que el bot puede
// añadirlo con su access token — sin invitaciones manuales.
//
// Se invoca desde la app (supabase.functions.invoke) con el JWT del usuario:
// DESPLEGAR CON "Verify JWT" ACTIVADO (al contrario que discord-match).
// Body: { provider_token: string } — el access token de Discord del login.
//
// Secrets (compartidos con discord-match): DISCORD_BOT_TOKEN,
// DISCORD_GUILD_ID, SB_SECRET_KEY.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { provider_token } = await req.json().catch(() => ({ provider_token: null }));
  if (!provider_token) {
    return new Response(JSON.stringify({ error: 'falta provider_token' }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (userError || !userId) {
    return new Response(JSON.stringify({ error: 'no autenticado' }), { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('discord_id')
    .eq('id', userId)
    .single();
  if (!profile?.discord_id) {
    return new Response(JSON.stringify({ status: 'sin discord vinculado' }), { status: 200 });
  }

  const guildId = Deno.env.get('DISCORD_GUILD_ID')!;
  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${profile.discord_id}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${Deno.env.get('DISCORD_BOT_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: provider_token }),
    }
  );

  // 201 = añadido, 204 = ya era miembro
  if (response.status === 201) console.log(`usuario ${profile.discord_id} añadido al servidor`);
  else if (response.status === 204) console.log(`usuario ${profile.discord_id} ya era miembro`);
  else console.error(`fallo al unir: ${response.status} ${await response.text()}`);

  return new Response(JSON.stringify({ status: response.status }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
