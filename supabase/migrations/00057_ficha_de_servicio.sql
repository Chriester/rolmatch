-- Ficha de servicio: agregado PÚBLICO de la vida rolera de un usuario —
-- sesiones jugadas, mesas, % de asistencia (según valoraciones de
-- compañeros) y antigüedad. Convierte en vitrina lo que ya registran
-- session_confirmations / group_members / ratings.
--
-- Mismo patrón que profile_xp y profile_reliability: la vista corre con
-- derechos del dueño (postgres), así que agrega por encima del RLS de las
-- tablas base y expone SOLO totales, nunca filas.

create view profile_service_stats as
select
  p.id as user_id,
  p.created_at as member_since,
  coalesce(sc.sessions_played, 0) as sessions_played,
  coalesce(gm.groups_count, 0) as groups_count,
  r.attendance_pct
from profiles p
left join (
  select user_id, count(*)::int as sessions_played
  from session_confirmations
  group by user_id
) sc on sc.user_id = p.id
left join (
  select user_id, count(distinct group_id)::int as groups_count
  from group_members
  group by user_id
) gm on gm.user_id = p.id
left join (
  -- asistencia según los compañeros que valoraron (rate.tsx): honesta y no farmeable
  select rated_id, round(100.0 * count(*) filter (where attended) / count(*))::int as attendance_pct
  from ratings
  group by rated_id
) r on r.rated_id = p.id;

grant select on profile_service_stats to authenticated;
