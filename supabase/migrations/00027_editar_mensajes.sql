-- Editar y borrar mensajes propios en el chat de mesa y en el 1-a-1.
-- edited_at marca los editados («editado» en la burbuja). replica identity
-- full: sin ella, los eventos UPDATE/DELETE de Realtime no traen las
-- columnas necesarias para filtrar por group_id/thread_id en el cliente.

alter table messages add column edited_at timestamptz;
alter table dm_messages add column edited_at timestamptz;

create policy "messages: editar los propios" on messages
  for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy "messages: borrar los propios" on messages
  for delete to authenticated
  using (sender_id = auth.uid());

create policy "dm_messages: editar los propios" on dm_messages
  for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy "dm_messages: borrar los propios" on dm_messages
  for delete to authenticated
  using (sender_id = auth.uid());

alter table messages replica identity full;
alter table dm_messages replica identity full;
