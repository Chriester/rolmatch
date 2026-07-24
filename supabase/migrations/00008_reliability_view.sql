-- Fiabilidad agregada por perfil (§5 Fase 3 + §7 del PRD).
-- Las valoraciones individuales siguen siendo privadas (RLS de ratings:
-- solo las ves si te involucran), pero el AGREGADO es público a propósito:
-- alimenta el 10 % de fiabilidad del matching y se muestra como media.
-- La vista se ejecuta con privilegios del owner (security definer) para
-- saltarse el RLS de la tabla base SOLO para estos agregados.

create view profile_reliability as
select
  rated_id,
  avg(reliability)::numeric(3, 2) as average,
  count(*)::int as ratings_count
from ratings
group by rated_id;

grant select on profile_reliability to authenticated;
