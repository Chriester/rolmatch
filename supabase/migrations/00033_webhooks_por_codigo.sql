-- Webhooks por código: los "Database Webhooks" del dashboard son triggers
-- de pg_net por debajo. Este helper lee el secret del Vault (nunca en el
-- repo, que es público) y publica el mismo payload {type, table, record}
-- que espera push-notify. A partir de ahora, un webhook nuevo = un trigger
-- en la migración, sin pasar por la UI.
--
-- REQUISITO una sola vez (SQL Editor, sustituye el valor real):
--   select vault.create_secret('<WEBHOOK_SECRET>', 'webhook_secret');

create or replace function app_push_webhook()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'webhook_secret'
  limit 1;

  -- sin secret en el vault: webhook mudo, la escritura original no se rompe
  if v_secret is not null then
    perform net.http_post(
      url := 'https://pyysoeztdtxwbtpxwdnl.supabase.co/functions/v1/push-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', TG_TABLE_NAME,
        'record', to_jsonb(new)
      )
    );
  end if;
  return new;
end;
$$;

-- Primer webhook creado por código: reportes → aviso a moderación.
-- (Si llegaste a crearlo en la UI como push-notify-reports, borra el de
-- la UI para no recibir el aviso duplicado.)
create trigger push_notify_reports
  after insert on reports
  for each row execute function app_push_webhook();
