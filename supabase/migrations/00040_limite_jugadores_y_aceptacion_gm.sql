-- Límite de jugadores por mesa + el match lo cierra siempre el GM.

-- 1) groups.max_players: límite elegible y editable; las plazas libres se
--    DERIVAN (límite − miembros sin contar al GM). Se acabó el recuento
--    manual de group_openings, que nadie descontaba al entrar un miembro.
--    La tabla group_openings queda obsoleta (se conserva sin uso).
alter table groups add column max_players smallint not null default 5
  check (max_players between 1 and 12);

update groups g
set max_players = least(12, greatest(1,
  (select count(*) from group_members gm
     where gm.group_id = g.id and gm.user_id <> g.owner_id)
  + coalesce((select sum(o.seats)::int from group_openings o
     where o.group_id = g.id and o.is_open), 0)));

-- 2) El like del jugador ya NO cierra el match aunque la mesa le hubiera
--    dado like antes (fichaje desde el feed): todo aspirante pasa por la
--    cola de Candidatos y es el like de la MESA (el aceptar del GM) el que
--    crea match + membresía.
create or replace function handle_reciprocal_swipe()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.direction = 'like' and new.origin = 'group' and exists (
    select 1 from swipes s
    where s.user_id = new.user_id
      and s.group_id = new.group_id
      and s.origin = 'user'
      and s.direction = 'like'
  ) then
    insert into matches (user_id, group_id)
    values (new.user_id, new.group_id)
    on conflict (user_id, group_id) do nothing;

    insert into group_members (group_id, user_id, member_role)
    values (new.group_id, new.user_id, 'player')
    on conflict (group_id, user_id) do nothing;
  end if;
  return new;
end;
$$;
