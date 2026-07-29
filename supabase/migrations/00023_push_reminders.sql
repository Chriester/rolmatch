-- Recordatorios de sesión por push (Expo) — independientes de los de Discord.
-- discord-reminders usa reminded_24h/reminded_1h; con Discord apagado en la
-- alpha (DISCORD_ENABLED=false) nadie recibía avisos. La función push-reminders
-- usa sus propios flags para que ambos canales puedan convivir al reactivarlo.

alter table sessions add column push_reminded_24h boolean not null default false;
alter table sessions add column push_reminded_1h boolean not null default false;

-- Cron (pegar en el SQL Editor DESPUÉS de desplegar la Edge Function
-- push-reminders con Verify JWT OFF; sustituir <WEBHOOK_SECRET>):
--
-- select cron.schedule(
--   'push-reminders-cada-15-min',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://pyysoeztdtxwbtpxwdnl.supabase.co/functions/v1/push-reminders',
--     headers := '{"Content-Type": "application/json", "x-webhook-secret": "<WEBHOOK_SECRET>"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
