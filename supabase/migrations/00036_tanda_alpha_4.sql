-- Tanda alpha 4: borrar cuenta, asistencia a partidas y reacciones.

-- ============================================================
-- 1) Borrar mi cuenta (RGPD básico + confianza del tester).
-- RPC security definer: borra primero lo que NO cae en cascada desde
-- profiles (groups.owner_id y sessions.created_by, aprendido en el reset)
-- y después la fila de auth.users, que arrastra todo lo demás.
-- ============================================================
create or replace function delete_my_account()
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
  delete from sessions where created_by = v_uid;
  delete from groups where owner_id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

-- ============================================================
-- 2) Asistencia previa a partidas fijadas: ✋ voy / 🙅 no voy.
-- (La confirmación POSTERIOR de «¿se jugó?» sigue en session_confirmations.)
-- ============================================================
create table session_rsvps (
  session_id uuid not null references sessions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status text not null check (status in ('yes', 'no')),
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table session_rsvps enable row level security;

create policy "rsvps: ven los miembros" on session_rsvps
  for select to authenticated
  using (exists (
    select 1 from sessions s
    where s.id = session_id and is_group_member(s.group_id)
  ));

create policy "rsvps: cada miembro marca la suya" on session_rsvps
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from sessions s
      where s.id = session_id and is_group_member(s.group_id)
    )
  );

create policy "rsvps: cambia la suya" on session_rsvps
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "rsvps: quita la suya" on session_rsvps
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================
-- 3) Reacciones a mensajes (mesa y 1-a-1), con Realtime.
-- ============================================================
create table message_reactions (
  message_id uuid not null references messages (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table message_reactions enable row level security;

create policy "reactions: ven los miembros" on message_reactions
  for select to authenticated
  using (exists (
    select 1 from messages m
    where m.id = message_id and is_group_member(m.group_id)
  ));

create policy "reactions: reacciona cada miembro" on message_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from messages m
      where m.id = message_id and is_group_member(m.group_id)
    )
  );

create policy "reactions: quita la suya" on message_reactions
  for delete to authenticated using (user_id = auth.uid());

create table dm_message_reactions (
  message_id uuid not null references dm_messages (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table dm_message_reactions enable row level security;

create policy "dm_reactions: ven los participantes" on dm_message_reactions
  for select to authenticated
  using (exists (
    select 1 from dm_messages dm
    join dm_threads t on t.id = dm.thread_id
    where dm.id = message_id and auth.uid() in (t.user_lo, t.user_hi)
  ));

create policy "dm_reactions: reacciona cada participante" on dm_message_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from dm_messages dm
      join dm_threads t on t.id = dm.thread_id
      where dm.id = message_id and auth.uid() in (t.user_lo, t.user_hi)
    )
  );

create policy "dm_reactions: quita la suya" on dm_message_reactions
  for delete to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table message_reactions;
alter publication supabase_realtime add table dm_message_reactions;
