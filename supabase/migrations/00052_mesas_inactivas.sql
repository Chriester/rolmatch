-- Las mesas muertas caducan solas (aviso primero, archivo después).
--
-- is_active era 100 % manual: una mesa abandonada seguía saliendo en el
-- feed para siempre, quemando tarjetas del poco inventario y generando
-- likes que nadie iba a contestar. Con ~15 testers cada tarjeta zombi
-- cuenta doble.
--
-- Modelo: `last_activity_at` se mantiene solo (triggers al escribir en el
-- chat, crear sesiones o escribir en el diario). Un cron diario:
--   1) mesa activa sin actividad en 28 días y sin avisar → marca
--      `inactivity_warned_at` (la app enseña el aviso al GM con un botón
--      de «seguimos jugando» que lo limpia);
--   2) avisada hace 7+ días y sigue sin actividad → is_active = false.
-- El archivo es reversible: el GM puede reabrir desde la ficha (update
-- normal por su política de dueño).

alter table groups
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists inactivity_warned_at timestamptz;

-- Punto de partida honesto: la actividad más reciente que conste en DB.
update groups g
set last_activity_at = greatest(
  g.created_at,
  coalesce((select max(m.created_at) from messages m where m.group_id = g.id), g.created_at),
  coalesce((select max(s.starts_at) from sessions s where s.group_id = g.id and s.starts_at <= now()), g.created_at)
);

-- security definer: el trigger corre con los permisos de quien escribe el
-- mensaje, y la política de update de groups solo deja al dueño.
create or replace function touch_group_activity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update groups
    set last_activity_at = now(), inactivity_warned_at = null
    where id = new.group_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_group on messages;
create trigger messages_touch_group
  after insert on messages
  for each row execute function touch_group_activity();

drop trigger if exists sessions_touch_group on sessions;
create trigger sessions_touch_group
  after insert on sessions
  for each row execute function touch_group_activity();

drop trigger if exists journal_touch_group on group_journal_entries;
create trigger journal_touch_group
  after insert on group_journal_entries
  for each row execute function touch_group_activity();

-- El barrido diario. 04:41 para no pisar la retención (04:17) ni el cuarto
-- de hora de push-reminders.
create extension if not exists pg_cron;

select cron.schedule(
  'mesas-inactivas-diario',
  '41 4 * * *',
  $$
  -- 1) avisar: 28 días paradas
  update groups
    set inactivity_warned_at = now()
    where is_active
      and inactivity_warned_at is null
      and last_activity_at < now() - interval '28 days';
  -- 2) archivar: avisadas hace 7+ días y siguen paradas
  update groups
    set is_active = false, inactivity_warned_at = null
    where is_active
      and inactivity_warned_at is not null
      and inactivity_warned_at < now() - interval '7 days'
      and last_activity_at < now() - interval '28 days';
  $$
);
