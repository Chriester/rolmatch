// Edge Function: redeem-promo
// Canjea un código promocional de premium. La app la invoca con la sesión
// del usuario. Verify JWT de la pasarela va DESACTIVADO: solo entiende los
// JWT legacy HS256 y este proyecto firma con claves asimétricas (ES256) —
// con él activado devolvía UNAUTHORIZED_ASYMMETRIC_JWT a todo el mundo.
// La sesión se valida aquí dentro con auth.getUser(jwt).
// Body: { code: string }
// Secrets: SB_SECRET_KEY (los códigos solo los ve el service role).

import { createClient } from 'jsr:@supabase/supabase-js@2';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { code } = await req.json().catch(() => ({ code: null }));
  if (!code || typeof code !== 'string') {
    return json({ error: 'Falta el código' }, 400);
  }
  const normalized = code.trim().toUpperCase();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SB_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: userData } = await supabase.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (!userId) return json({ error: 'No autenticado' }, 401);

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('code, premium_days, max_uses, uses, expires_at')
    .eq('code', normalized)
    .maybeSingle();

  if (!promo) return json({ error: 'Código no válido' }, 404);
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return json({ error: 'El código ha caducado' }, 410);
  }
  if (promo.uses >= promo.max_uses) {
    return json({ error: 'El código ha alcanzado su límite de usos' }, 410);
  }

  // Un canje por usuario y código
  const { error: redemptionError } = await supabase
    .from('promo_redemptions')
    .insert({ code: normalized, user_id: userId });
  if (redemptionError) {
    if (redemptionError.code === '23505') {
      return json({ error: 'Ya has canjeado este código' }, 409);
    }
    console.error(`error registrando canje: ${JSON.stringify(redemptionError)}`);
    return json({ error: 'Error interno' }, 500);
  }

  const premiumUntil =
    promo.premium_days === null
      ? 'infinity'
      : new Date(Date.now() + promo.premium_days * 24 * 3600_000).toISOString();

  const [{ error: profileError }] = await Promise.all([
    supabase
      .from('profiles')
      .update({ premium_until: premiumUntil, premium_source: 'promo' })
      .eq('id', userId),
    supabase
      .from('promo_codes')
      .update({ uses: promo.uses + 1 })
      .eq('code', normalized),
  ]);
  if (profileError) {
    console.error(`error concediendo premium: ${JSON.stringify(profileError)}`);
    return json({ error: 'Error interno' }, 500);
  }

  console.log(`código ${normalized} canjeado por ${userId} → premium hasta ${premiumUntil}`);
  return json({ premium_until: premiumUntil });
});
