-- Los bloqueos (00002) ya excluyen del feed, pero el chat 1-a-1 (00025) no
-- los miraba: alguien bloqueado con quien compartes mesa podía abrirte un
-- hilo o seguir escribiendo en uno existente. Cerramos ambos agujeros en la
-- base de datos; el cliente además oculta los hilos bloqueados de la lista.

create or replace function is_blocked_between(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

drop policy "dm_threads: crear si compartes mesa" on dm_threads;
create policy "dm_threads: crear si compartes mesa" on dm_threads
  for insert to authenticated
  with check (
    auth.uid() in (user_lo, user_hi)
    and shares_group_with(user_lo, user_hi)
    and not is_blocked_between(user_lo, user_hi)
  );

drop policy "dm_messages: escriben los participantes" on dm_messages;
create policy "dm_messages: escriben los participantes" on dm_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from dm_threads t
      where t.id = dm_messages.thread_id
        and auth.uid() in (t.user_lo, t.user_hi)
        and not is_blocked_between(t.user_lo, t.user_hi)
    )
  );
