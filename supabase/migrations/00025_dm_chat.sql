-- Chat 1-a-1 entre usuarios que comparten mesa (issue #42). No es primer
-- contacto (el match ya te mete en la mesa): es el canal privado GM↔jugador
-- o jugador↔jugador una vez os conocéis. El hilo sobrevive aunque uno deje
-- la mesa (como cualquier mensajería); solo CREAR hilos exige mesa común.

-- ¿Comparten mesa estos dos usuarios? security definer para poder mirar
-- group_members sin que las políticas de esa tabla interfieran.
create or replace function shares_group_with(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from group_members ga
    join group_members gb on gb.group_id = ga.group_id
    where ga.user_id = a and gb.user_id = b
  );
$$;

create table dm_threads (
  id uuid primary key default gen_random_uuid(),
  -- par normalizado (user_lo < user_hi) para que el unique impida duplicados
  user_lo uuid not null references profiles (id) on delete cascade,
  user_hi uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_lo, user_hi),
  check (user_lo < user_hi)
);

alter table dm_threads enable row level security;

create policy "dm_threads: ven los participantes" on dm_threads
  for select to authenticated
  using (auth.uid() in (user_lo, user_hi));

create policy "dm_threads: crear si compartes mesa" on dm_threads
  for insert to authenticated
  with check (
    auth.uid() in (user_lo, user_hi)
    and shares_group_with(user_lo, user_hi)
  );

create table dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references dm_threads (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  -- mismo contrato que messages tras 00014: texto obligatorio solo en 'text'
  body text check (body is null or char_length(body) <= 2000),
  kind text not null default 'text' check (kind in ('text', 'gif', 'sticker')),
  media_url text,
  created_at timestamptz not null default now(),
  check (kind <> 'text' or char_length(btrim(coalesce(body, ''))) > 0)
);

create index dm_messages_thread_created_idx on dm_messages (thread_id, created_at desc);

alter table dm_messages enable row level security;

create policy "dm_messages: ven los participantes" on dm_messages
  for select to authenticated
  using (
    exists (
      select 1 from dm_threads t
      where t.id = dm_messages.thread_id and auth.uid() in (t.user_lo, t.user_hi)
    )
  );

create policy "dm_messages: escriben los participantes" on dm_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from dm_threads t
      where t.id = dm_messages.thread_id and auth.uid() in (t.user_lo, t.user_hi)
    )
  );

create table dm_reads (
  thread_id uuid not null references dm_threads (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

alter table dm_reads enable row level security;

create policy "dm_reads: ver las propias" on dm_reads
  for select to authenticated using (auth.uid() = user_id);

create policy "dm_reads: marcar la propia siendo participante" on dm_reads
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from dm_threads t
      where t.id = dm_reads.thread_id and auth.uid() in (t.user_lo, t.user_hi)
    )
  );

create policy "dm_reads: actualizar la propia" on dm_reads
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime para la pantalla de chat (mismo mecanismo que messages)
alter publication supabase_realtime add table dm_messages;
