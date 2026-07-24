-- Chat de texto en la app por mesa: ya no dependemos de Discord como canal
-- obligatorio. Visible a todos los miembros de la mesa, vía Realtime.

create table messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index messages_group_created_idx on messages (group_id, created_at desc);

alter table messages enable row level security;

create policy "messages: ven los miembros de la mesa" on messages
  for select to authenticated
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "messages: los miembros escriben" on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from group_members gm
      where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table messages;
