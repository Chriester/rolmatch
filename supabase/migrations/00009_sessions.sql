-- Calendario de sesiones por mesa (§5 Fase 3): fechas concretas de juego.
-- Los recordatorios los envía la Edge Function discord-reminders (cron cada
-- 15 min) al canal de Discord de la mesa: uno ~24 h antes y otro ~1 h antes.

create table sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  starts_at timestamptz not null,
  title text,
  created_by uuid not null references profiles (id),
  reminded_24h boolean not null default false,
  reminded_1h boolean not null default false,
  created_at timestamptz not null default now()
);

create index sessions_starts_idx on sessions (starts_at);

alter table sessions enable row level security;

create policy "sessions: ven los miembros de la mesa" on sessions
  for select to authenticated
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = sessions.group_id and gm.user_id = auth.uid()
    )
  );

create policy "sessions: gestiona el dueño de la mesa" on sessions
  for all to authenticated
  using (exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid()));
