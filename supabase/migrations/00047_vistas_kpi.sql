-- Los KPIs del PRD (§11) como vistas, no como comentarios.
--
-- La 00043 dejó las consultas de retención y embudo COMENTADAS dentro de la
-- migración: nadie las va a copiar de ahí cada vez. Y el KPI «% de matches
-- que llegan a jugar» tenía los datos (session_confirmations, 00017) pero
-- ninguna consulta escrita. Con esto, medir es `select * from kpi_...` en el
-- SQL Editor.
--
-- Solo para el dashboard: se revoca el select a anon/authenticated para que
-- PostgREST no las exponga (agregan datos de TODOS los usuarios). El SQL
-- Editor va como postgres y no le afecta.
--
-- Los bots del seed (@test.rolmatch.local) quedan fuera de todas: inflarían
-- las altas y hundirían la retención.

-- Usuarios reales: perfiles que no son bots del mundo de prueba.
create view kpi_usuarios_reales as
  select p.id, p.created_at
  from profiles p
  join auth.users u on u.id = p.id
  where coalesce(u.email, '') not like '%@test.rolmatch.local';

-- KPI 1 — «% de usuarios que completan perfil con disponibilidad» (> 70 %).
-- Completar disponibilidad = existir en availability_slots (el mismo
-- criterio que usa la app: hasCompletedOnboarding en src/lib/profile.ts).
create view kpi_perfil_completo as
  select date_trunc('week', b.created_at)::date as semana_alta,
         count(*) as altas,
         count(*) filter (where exists (
           select 1 from availability_slots s where s.user_id = b.id
         )) as con_disponibilidad,
         round(100.0 * count(*) filter (where exists (
           select 1 from availability_slots s where s.user_id = b.id
         )) / count(*), 1) as pct
  from kpi_usuarios_reales b
  group by 1 order by 1;

-- KPI 2 — «tiempo hasta el primer match» (< 72 h). Solo cuenta a quien ya
-- tiene match; la mediana evita que un caso raro arrastre la media.
create view kpi_primer_match as
  with primero as (
    select b.id, b.created_at, min(m.matched_at) as primer_match
    from kpi_usuarios_reales b
    join matches m on m.user_id = b.id
    group by 1, 2
  )
  select date_trunc('week', created_at)::date as semana_alta,
         count(*) as con_match,
         round((percentile_cont(0.5) within group (
           order by extract(epoch from primer_match - created_at)
         ) / 3600)::numeric, 1) as mediana_horas,
         round(100.0 * count(*) filter (
           where primer_match - created_at <= interval '72 hours'
         ) / count(*), 1) as pct_en_72h
  from primero
  group by 1 order by 1;

-- KPI 3 — «% de matches que llegan a jugar una sesión» (> 30 %). Un match
-- «juega» si su usuario confirmó asistencia a una sesión de esa mesa
-- posterior al match y que ya ha empezado. Los matches de la última semana
-- casi nunca han tenido tiempo de jugar: mirar también pct_maduros.
create view kpi_matches_que_juegan as
  with evaluado as (
    select m.id,
           m.matched_at < now() - interval '14 days' as maduro,
           exists (
             select 1
             from sessions s
             join session_confirmations c
               on c.session_id = s.id and c.user_id = m.user_id
             where s.group_id = m.group_id
               and s.starts_at >= m.matched_at
               and s.starts_at <= now()
           ) as jugado
    from matches m
    join kpi_usuarios_reales b on b.id = m.user_id
  )
  select count(*) as matches,
         count(*) filter (where jugado) as llegan_a_jugar,
         round(100.0 * count(*) filter (where jugado) / nullif(count(*), 0), 1) as pct,
         round(100.0 * count(*) filter (where jugado and maduro)
               / nullif(count(*) filter (where maduro), 0), 1) as pct_maduros
  from evaluado;

-- KPI 4 — «retención semana 4» (> 25 %): abrió la app entre la semana 3 y
-- la 4 desde su alta. Cohortes recientes salen bajas por definición (aún no
-- han llegado a la semana 4): mirar solo cohortes con 4+ semanas de vida.
create view kpi_retencion as
  select date_trunc('week', b.created_at)::date as cohorte,
         count(distinct b.id) as altas,
         count(distinct e.user_id) filter (
           where e.created_at between b.created_at + interval '3 weeks'
                                  and b.created_at + interval '4 weeks'
         ) as siguen_semana_4,
         round(100.0 * count(distinct e.user_id) filter (
           where e.created_at between b.created_at + interval '3 weeks'
                                  and b.created_at + interval '4 weeks'
         ) / count(distinct b.id), 1) as pct
  from kpi_usuarios_reales b
  left join analytics_events e on e.user_id = b.id and e.name = 'app_open'
  group by 1 order by 1;

-- Apoyo — embudo de onboarding: dónde se cae la gente, paso a paso.
create view kpi_onboarding_embudo as
  select props ->> 'step' as paso, count(distinct user_id) as personas
  from analytics_events
  where name = 'onboarding_step'
  group by 1
  union all
  select 'completado', count(distinct user_id)
  from analytics_events
  where name = 'onboarding_completed'
  order by 1;

-- Apoyo — con qué frecuencia el feed se queda vacío (últimos 30 días), y
-- por qué filtro se cayeron las mesas cuando pasó.
create view kpi_feed_vacio as
  select count(*) filter (where name = 'app_open') as aperturas,
         count(*) filter (where name = 'feed_empty') as feed_vacio,
         round(100.0 * count(*) filter (where name = 'feed_empty')
               / nullif(count(*) filter (where name = 'app_open'), 0), 1) as pct,
         count(*) filter (where name = 'feed_empty'
                            and (props ->> 'filtered_schedule')::int > 0) as por_horario,
         count(*) filter (where name = 'feed_empty'
                            and (props ->> 'filtered_system')::int > 0) as por_sistema,
         count(*) filter (where name = 'feed_empty'
                            and (props ->> 'filtered_language')::int > 0) as por_idioma
  from analytics_events
  where created_at > now() - interval '30 days';

-- Fuera de la API: son agregados de toda la base, solo para el dashboard.
revoke all on kpi_usuarios_reales, kpi_perfil_completo, kpi_primer_match,
  kpi_matches_que_juegan, kpi_retencion, kpi_onboarding_embudo, kpi_feed_vacio
  from anon, authenticated;
