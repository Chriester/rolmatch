-- Analítica mínima para poder medir los KPIs del PRD (§11).
--
-- Hoy no se mide nada: lo único instrumentado son los errores de cliente
-- (00037). Sin esto, «% de perfiles completos», «tiempo hasta el primer
-- match» o «retención a las 4 semanas» son opiniones.
--
-- Coste 0 y sin terceros: una tabla en el propio Postgres, como client_errors.
-- Solo se registra lo que NO se puede deducir ya del esquema. Los matches,
-- los mensajes y las sesiones jugadas ya tienen su created_at en sus tablas:
-- duplicarlos aquí sería ruido. Lo que falta es lo que no deja rastro —
-- abrir la app (retención), dónde se abandona el onboarding, y cuándo el
-- feed se queda vacío.
--
-- No hay política de select a propósito: la app solo escribe. Las consultas
-- se hacen desde el SQL Editor, que va con service_role y se salta la RLS.
--
-- Ejemplos para el SQL Editor:
--
--   -- retención semanal (cohortes por semana de alta)
--   select date_trunc('week', p.created_at) as cohorte,
--          count(distinct p.id) as altas,
--          count(distinct e.user_id) filter (
--            where e.created_at between p.created_at + interval '3 weeks'
--                                   and p.created_at + interval '4 weeks'
--          ) as siguen_a_las_4_semanas
--   from profiles p
--   left join analytics_events e on e.user_id = p.id and e.name = 'app_open'
--   group by 1 order by 1;
--
--   -- embudo de onboarding: cuánta gente se cae en cada paso
--   select props->>'step' as paso, count(distinct user_id)
--   from analytics_events where name = 'onboarding_step'
--   group by 1 order by 1;
--
--   -- cuántas sesiones acaban con el feed vacío
--   select count(*) filter (where name = 'feed_empty')::float
--          / nullif(count(*) filter (where name = 'app_open'), 0)
--   from analytics_events where created_at > now() - interval '30 days';

create table analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2000),
  created_at timestamptz not null default now()
);

alter table analytics_events enable row level security;

-- Solo escritura, y solo de lo propio: nadie puede inflar los datos de otro
-- ni leer los ajenos (no hay política de select).
create policy "analytics: registrar lo propio" on analytics_events
  for insert to authenticated with check (auth.uid() = user_id);

create index analytics_events_name_created_idx on analytics_events (name, created_at desc);
create index analytics_events_user_created_idx on analytics_events (user_id, created_at desc);
