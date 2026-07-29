-- Organizar partida v2 (rediseño pedido por Chris):
-- 1. Proponer fechas pasa a ser SOLO del GM (antes cualquier miembro).
-- 2. Las votaciones pueden tener fecha de cierre (closes_at) elegida al
--    crearlas; el cron de push-reminders avisa al GM cuando vence.
-- 3. Los jugadores pueden proponer una fecha EXTRA a una votación abierta:
--    va a una bandeja que solo ve el GM, que la añade o la rechaza.

alter table session_polls add column closes_at timestamptz;
alter table session_polls add column deadline_notified boolean not null default false;

-- crear votaciones: solo el dueño de la mesa
drop policy "session_polls: crea cualquier miembro" on session_polls;
create policy "session_polls: crea el GM" on session_polls
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create table session_poll_proposals (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references session_polls (id) on delete cascade,
  proposer_id uuid not null references profiles (id) on delete cascade,
  starts_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

alter table session_poll_proposals enable row level security;

-- la bandeja es del GM; cada proponente ve las suyas (para saber su estado)
create policy "poll_proposals: ven GM y proponente" on session_poll_proposals
  for select to authenticated
  using (
    proposer_id = auth.uid()
    or exists (
      select 1 from session_polls p
      join groups g on g.id = p.group_id
      where p.id = poll_id and g.owner_id = auth.uid()
    )
  );

create policy "poll_proposals: propone cualquier miembro en votacion abierta" on session_poll_proposals
  for insert to authenticated
  with check (
    proposer_id = auth.uid()
    and exists (
      select 1 from session_polls p
      where p.id = poll_id and p.status = 'open' and is_group_member(p.group_id)
    )
  );

create policy "poll_proposals: resuelve el GM" on session_poll_proposals
  for update to authenticated
  using (
    exists (
      select 1 from session_polls p
      join groups g on g.id = p.group_id
      where p.id = poll_id and g.owner_id = auth.uid()
    )
  );
