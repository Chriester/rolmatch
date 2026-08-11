-- Traspasar la mesa a otro miembro: que irse el GM no mate la mesa.
--
-- Borrar la cuenta de un GM disuelve sus mesas (00036: delete from groups
-- where owner_id) — con chat, diario y calendario — para TODOS los miembros
-- y sin que se enteren hasta entrar. Las mesas que funcionan son el activo
-- más valioso de la app: tienen que poder sobrevivir a su creador.
--
-- security definer a propósito: la política de update de groups exige
-- owner_id = auth.uid() en el with check, así que un update normal no puede
-- escribir otro dueño. La función valida lo mismo que validaría la política
-- (que llama el dueño actual y que el nuevo es miembro) y hace el cambio de
-- roles en la misma transacción.

create or replace function transfer_group(p_group_id uuid, p_new_owner uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sin sesión';
  end if;
  if not exists (select 1 from groups where id = p_group_id and owner_id = v_uid) then
    raise exception 'solo el GM actual puede traspasar la mesa';
  end if;
  if p_new_owner = v_uid then
    raise exception 'ya eres el GM de esta mesa';
  end if;
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = p_new_owner
  ) then
    raise exception 'el nuevo GM tiene que ser miembro de la mesa';
  end if;

  update groups set owner_id = p_new_owner where id = p_group_id;
  update group_members
    set member_role = 'gm'
    where group_id = p_group_id and user_id = p_new_owner;
  update group_members
    set member_role = 'player'
    where group_id = p_group_id and user_id = v_uid;
end;
$$;

revoke execute on function transfer_group(uuid, uuid) from public;
grant execute on function transfer_group(uuid, uuid) to authenticated;
