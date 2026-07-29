-- El historico pasa a ser un evento ligado al calendario: solo se puede
-- escribir el dia (en la timezone de la mesa) en que hay una sesion
-- programada en `sessions`. Un trigger enlaza cada entrada con la sesion de
-- ese dia; sin sesion hoy, el RLS de insert la rechaza. La primera persona
-- que abre el historico ese dia crea el mensaje de sistema
-- "Partida del <dia>" (is_system = true, una por sesion, sin XP).

alter table group_journal_entries
  add column session_id uuid references sessions (id) on delete set null,
  add column is_system boolean not null default false;

create index group_journal_entries_session_idx on group_journal_entries (session_id);

-- Como mucho un mensaje de sistema por sesion.
create unique index group_journal_entries_one_header_per_session
  on group_journal_entries (session_id)
  where is_system;

-- Sesion de esta mesa cuya fecha (en la timezone de la mesa) es hoy, si hay
-- alguna. La usan tanto el trigger de abajo como el cliente (via rpc) para
-- saber si el histórico esta "abierto" hoy.
create or replace function journal_today_session(p_group_id uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select s.id
  from sessions s
  join groups g on g.id = s.group_id
  where s.group_id = p_group_id
    and (s.starts_at at time zone g.timezone)::date = (now() at time zone g.timezone)::date
  order by s.starts_at
  limit 1;
$$;

create or replace function group_journal_entries_set_session()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.session_id := journal_today_session(new.group_id);
  return new;
end;
$$;

create trigger group_journal_entries_session_trigger
  before insert on group_journal_entries
  for each row execute function group_journal_entries_set_session();

drop policy "group_journal_entries: los miembros escriben" on group_journal_entries;

create policy "group_journal_entries: los miembros escriben el dia de partida" on group_journal_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and session_id is not null
    and is_group_member(group_id)
  );

-- El mensaje de sistema no se borra (es el titulo del capitulo).
drop policy "group_journal_entries: el autor borra su entrada" on group_journal_entries;

create policy "group_journal_entries: el autor borra su entrada" on group_journal_entries
  for delete to authenticated
  using (author_id = auth.uid() and not is_system);

-- El mensaje de sistema no otorga XP (no es contenido de un jugador).
drop trigger xp_journal_entry on group_journal_entries;

create trigger xp_journal_entry
  after insert on group_journal_entries
  for each row
  when (not new.is_system)
  execute function xp_on_journal_entry();
