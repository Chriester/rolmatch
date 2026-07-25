-- Historico de la mesa: los jugadores comparten momentos (frase y/o foto) de
-- la partida, en orden cronologico. Mismo patron de RLS que messages
-- (visible e insertable solo para miembros de la mesa).

create table group_journal_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text check (char_length(btrim(body)) > 0 and char_length(body) <= 500),
  image_url text,
  created_at timestamptz not null default now(),
  constraint group_journal_entries_has_content check (body is not null or image_url is not null)
);

create index group_journal_entries_group_created_idx on group_journal_entries (group_id, created_at desc);

alter table group_journal_entries enable row level security;

create policy "group_journal_entries: ven los miembros de la mesa" on group_journal_entries
  for select to authenticated
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_journal_entries.group_id and gm.user_id = auth.uid()
    )
  );

create policy "group_journal_entries: los miembros escriben" on group_journal_entries
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from group_members gm
      where gm.group_id = group_journal_entries.group_id and gm.user_id = auth.uid()
    )
  );

create policy "group_journal_entries: el autor borra su entrada" on group_journal_entries
  for delete to authenticated
  using (author_id = auth.uid());
