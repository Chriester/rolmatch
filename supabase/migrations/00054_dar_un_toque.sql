-- «Dar un toque» (entregable 2d): avisar al miembro al que le falta
-- confirmar asistencia (o votar fecha) sin perseguirle por el chat.
--
-- Un toque es una fila: el trigger reutiliza app_push_webhook() (00053) y
-- push-notify convierte el INSERT en un push dirigido al destinatario.
--
-- Anti-spam de serie: UNIQUE (kind, ref_id, to_user) — sobre un mismo
-- asunto, a cada persona se le da UN toque en total, dé quien lo dé. El
-- segundo intento choca con la constraint y la UI lo enseña como «avisado».

create table nudges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  -- confirm = confirma asistencia a la sesión; vote = vota fecha en el poll
  kind text not null check (kind in ('confirm', 'vote')),
  /** session_id o poll_id según kind */
  ref_id uuid not null,
  to_user uuid not null references profiles (id) on delete cascade,
  from_user uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kind, ref_id, to_user)
);

alter table nudges enable row level security;

-- lo da un miembro de la mesa, a otro miembro, en su nombre
create policy "nudges: dar un toque siendo de la mesa" on nudges
  for insert to authenticated
  with check (
    from_user = auth.uid()
    and is_group_member(group_id)
    and exists (
      select 1 from group_members m
      where m.group_id = nudges.group_id and m.user_id = nudges.to_user
    )
  );

-- leerlos pinta el estado «avisado» en la agenda
create policy "nudges: ver los de mis mesas" on nudges
  for select to authenticated
  using (is_group_member(group_id));

create trigger push_notify_nudge
  after insert on nudges
  for each row execute function app_push_webhook();
