-- Votaciones de sesión: cualquier miembro propone días/franjas y la mesa
-- vota cuáles le van bien (multivoto). El GM programa la ganadora como
-- sesión real (tabla sessions, 00009). RLS: todo queda dentro de la mesa.

create table session_polls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  created_by uuid not null references profiles (id) on delete cascade,
  title text check (char_length(title) <= 120),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table session_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references session_polls (id) on delete cascade,
  starts_at timestamptz not null
);

create table session_poll_votes (
  option_id uuid not null references session_poll_options (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (option_id, user_id)
);

alter table session_polls enable row level security;
alter table session_poll_options enable row level security;
alter table session_poll_votes enable row level security;

-- Helper de membresía (se repite mucho en estas políticas)
create or replace function is_group_member(p_group_id uuid)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid()
  );
$$;

create policy "session_polls: ven los miembros" on session_polls
  for select to authenticated using (is_group_member(group_id));

create policy "session_polls: crea cualquier miembro" on session_polls
  for insert to authenticated
  with check (created_by = auth.uid() and is_group_member(group_id));

create policy "session_polls: cierra el creador o el GM" on session_polls
  for update to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "poll_options: ven los miembros" on session_poll_options
  for select to authenticated
  using (exists (
    select 1 from session_polls p
    where p.id = poll_id and is_group_member(p.group_id)
  ));

create policy "poll_options: crea el creador de la votacion" on session_poll_options
  for insert to authenticated
  with check (exists (
    select 1 from session_polls p
    where p.id = poll_id and p.created_by = auth.uid()
  ));

create policy "poll_votes: ven los miembros" on session_poll_votes
  for select to authenticated
  using (exists (
    select 1 from session_poll_options o
    join session_polls p on p.id = o.poll_id
    where o.id = option_id and is_group_member(p.group_id)
  ));

create policy "poll_votes: vota cada miembro por si mismo" on session_poll_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from session_poll_options o
      join session_polls p on p.id = o.poll_id
      where o.id = option_id and p.status = 'open' and is_group_member(p.group_id)
    )
  );

create policy "poll_votes: quita su voto" on session_poll_votes
  for delete to authenticated using (user_id = auth.uid());
