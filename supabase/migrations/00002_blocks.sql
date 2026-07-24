-- Bloqueos entre usuarios (§5 Fase 1: reportar/bloquear + moderación básica).
-- El bloqueo es simétrico en efecto: ninguno de los dos vuelve a ver al otro
-- en los feeds (el filtrado lo aplica el cliente leyendo esta tabla).

create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table blocks enable row level security;

-- Ambas partes pueden saber que existe el bloqueo (necesario para filtrar
-- los feeds en las dos direcciones), pero no quién más ha bloqueado a quién.
create policy "blocks: ver los que me involucran" on blocks
  for select to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "blocks: crear el propio" on blocks
  for insert to authenticated with check (auth.uid() = blocker_id);

create policy "blocks: quitar el propio" on blocks
  for delete to authenticated using (auth.uid() = blocker_id);
