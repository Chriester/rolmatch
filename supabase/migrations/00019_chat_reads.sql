-- Marca de lectura por chat: cuándo vio cada miembro el chat de cada mesa
-- por última vez. Alimenta el badge de no-leídos en «Mis chats».

create table chat_reads (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table chat_reads enable row level security;

create policy "chat_reads: ver las propias" on chat_reads
  for select to authenticated using (auth.uid() = user_id);

create policy "chat_reads: marcar la propia siendo miembro" on chat_reads
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from group_members gm
      where gm.group_id = chat_reads.group_id and gm.user_id = auth.uid()
    )
  );

create policy "chat_reads: actualizar la propia" on chat_reads
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
