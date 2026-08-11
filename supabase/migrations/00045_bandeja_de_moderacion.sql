-- Moderación con salida, no solo con entrada.
--
-- Había tubería de entrada (reportar, bloquear, aviso push a is_moderator) y
-- ninguna de salida: reports solo se INSERTA —no hay ni una lectura en el
-- cliente—, el enum report_status (open/reviewed/actioned) no se actualizaba
-- nunca y no existía pantalla. Un moderador recibía el push y no tenía a
-- dónde ir; todo se gestionaba a mano desde el SQL Editor.
--
-- 1) Reportar un mensaje concreto, no solo «este usuario». Se guarda además
--    un extracto del texto: es la prueba, y tiene que sobrevivir a que el
--    autor borre el mensaje (que es justo lo que hará). Por eso el extracto
--    es una copia y no un join.
-- 2) Los moderadores pueden LEER la cola y marcar cada reporte.

alter table reports add column if not exists reported_message_id uuid
  references messages (id) on delete set null;
alter table reports add column if not exists message_excerpt text
  check (char_length(message_excerpt) <= 500);

create index if not exists reports_status_created_idx on reports (status, created_at desc);

-- security definer: la política de reports consulta profiles, y así no
-- depende de cómo evolucionen las políticas de esa tabla.
create or replace function is_moderator()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select p.is_moderator from profiles p where p.id = auth.uid()), false);
$$;

revoke execute on function is_moderator() from public;
grant execute on function is_moderator() to authenticated;

create policy "reports: los moderadores ven la cola" on reports
  for select to authenticated
  using (is_moderator());

create policy "reports: los moderadores los marcan" on reports
  for update to authenticated
  using (is_moderator())
  with check (is_moderator());
