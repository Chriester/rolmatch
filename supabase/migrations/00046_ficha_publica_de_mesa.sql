-- Ficha de mesa visible sin cuenta, solo por enlace de invitación.
--
-- El enlace compartido es hoy el mejor motor de crecimiento de la app, y
-- aterrizaba en un muro de login seguido de un onboarding de cuatro pasos:
-- la gente tenía que darse de alta para saber SI LE INTERESABA la mesa a la
-- que le habían invitado. Con esto ve de qué va antes de decidir.
--
-- No se abre la tabla groups a anónimos: una función que devuelve solo lo
-- que enseña la tarjeta de invitación. Sin lista de miembros, sin ids de
-- nadie, sin descripción de quién está dentro — el alias del GM y el
-- recuento de plazas es todo lo que hace falta para decidir si entras.
--
-- security definer porque el anónimo no puede leer groups; el filtro por
-- is_active va dentro, así que una mesa disuelta no se puede espiar.

create or replace function public_group_card(p_group_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  image_url text,
  format text,
  frequency text,
  session_weekday smallint,
  session_slot smallint,
  timezone text,
  system_name text,
  max_players smallint,
  taken_seats integer,
  owner_alias text,
  owner_avatar_url text
)
language sql
stable
security definer set search_path = public
as $$
  select
    g.id,
    g.name,
    g.description,
    g.image_url,
    g.format,
    g.frequency,
    g.session_weekday,
    g.session_slot,
    g.timezone,
    s.name,
    g.max_players,
    (select count(*)::int from group_members m
      where m.group_id = g.id and m.user_id <> g.owner_id),
    p.alias,
    p.avatar_url
  from groups g
  left join systems s on s.id = g.system_id
  left join profiles p on p.id = g.owner_id
  where g.id = p_group_id and g.is_active;
$$;

revoke execute on function public_group_card(uuid) from public;
grant execute on function public_group_card(uuid) to anon, authenticated;
