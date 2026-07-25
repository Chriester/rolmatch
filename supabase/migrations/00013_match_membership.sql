-- Un match convierte al jugador en miembro de la mesa. Hasta ahora nadie
-- insertaba en group_members salvo el GM al crear la mesa (createGroup), así
-- que todo lo que depende de la membresía dejaba fuera a los jugadores con
-- match: la lista "Miembros", las sesiones programadas (RLS de 00009) y el
-- chat de mesa que llega en la 00012 (rama feature/chat-mesa, cuyo número
-- queda reservado — por eso esta es la 00013 aunque se aplique antes).

-- El trigger de match ahora crea también la membresía. security definer:
-- salta el RLS de group_members ("gestiona el dueño"), igual que ya hacía
-- con matches.
create or replace function handle_reciprocal_swipe()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.direction = 'like' and exists (
    select 1 from swipes s
    where s.user_id = new.user_id
      and s.group_id = new.group_id
      and s.origin <> new.origin
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

-- Backfill: los matches activos que ya existían pasan a ser miembros.
insert into group_members (group_id, user_id, member_role)
select m.group_id, m.user_id, 'player'
from matches m
where m.status = 'active'
on conflict (group_id, user_id) do nothing;
