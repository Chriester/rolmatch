-- Aviso push "hoy toca partida" cuando empieza el dia calendario de la
-- sesion (en la timezone de la mesa) — distinto de push_reminded_24h/1h,
-- que cuentan horas absolutas hasta la hora exacta de inicio. Es el mismo
-- momento en que el historico (migr. 00028) se abre para escribir.

alter table sessions add column push_reminded_day_start boolean not null default false;

-- Sesiones de cualquier mesa cuya fecha (en la timezone de esa mesa) es
-- hoy y que push-reminders aun no aviso. Sin "security definer": si se
-- llama como usuario autenticado, el RLS de sessions/groups sigue
-- aplicando (solo veria sus propias mesas); push-reminders la llama con
-- la service role, que ya ignora RLS.
create or replace function sessions_starting_today()
returns table (
  id uuid,
  group_id uuid,
  starts_at timestamptz,
  title text,
  group_name text
)
language sql
stable
as $$
  select s.id, s.group_id, s.starts_at, s.title, g.name as group_name
  from sessions s
  join groups g on g.id = s.group_id
  where not s.push_reminded_day_start
    and (s.starts_at at time zone g.timezone)::date = (now() at time zone g.timezone)::date;
$$;
