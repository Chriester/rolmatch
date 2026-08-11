-- Cancelar una partida (quitarla de "Próximas sesiones", groups/[id]/index.tsx)
-- avisa a los miembros de la mesa. Reutiliza el helper de webhooks por
-- código (migr. 00033), generalizado para DELETE (donde no hay NEW, solo
-- OLD) — así cualquier tabla futura puede engancharse igual sin volver a
-- tocar esta función.

create or replace function app_push_webhook()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_secret text;
  v_record jsonb;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'webhook_secret'
  limit 1;

  -- sin secret en el vault: webhook mudo, la escritura original no se rompe
  if v_secret is not null then
    v_record := case
      when TG_OP = 'DELETE' then to_jsonb(old) || jsonb_build_object('deleted_by', auth.uid())
      else to_jsonb(new)
    end;
    perform net.http_post(
      url := 'https://pyysoeztdtxwbtpxwdnl.supabase.co/functions/v1/push-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', v_secret
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', v_record
      )
    );
  end if;
  return coalesce(new, old);
end;
$$;

create trigger push_notify_session_cancelled
  after delete on sessions
  for each row execute function app_push_webhook();
