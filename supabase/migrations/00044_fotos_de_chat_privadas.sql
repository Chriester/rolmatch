-- Las fotos de chat dejan de ser públicas, y borrar la cuenta borra de verdad.
--
-- 1) Hasta ahora las fotos del chat de mesa Y de los privados se subían al
--    bucket `avatars`, que es público: una foto enviada en un 1-a-1 tenía URL
--    abierta, sin sesión, indexable y para siempre. La 00038 lo dejó dicho
--    («reutiliza el bucket público avatars») pero eso no vale para un privado.
--
--    Bucket nuevo `chat-media`, privado. Las rutas llevan el ámbito delante
--    (group/<group_id>/<user_id>/… y dm/<thread_id>/<user_id>/…) para que la
--    política pueda comprobar quién puede mirar: los miembros de esa mesa o
--    los dos del hilo. Se sirve con URLs firmadas.
--
--    Las fotos ya subidas siguen en `avatars` y siguen siendo públicas: el
--    cliente distingue por la forma del valor guardado en media_url (URL
--    completa = vieja y pública; ruta = nueva y firmada). Moverlas requiere
--    copiar objeto a objeto por la API de Storage; se puede hacer luego con
--    un script, pero no se puede hacer desde SQL.
--
-- 2) delete_my_account borraba filas pero ningún objeto de Storage: avatar,
--    retratos, fotos de chat y de diario seguían vivos y accesibles tras el
--    «Se borra todo. No se puede deshacer» que promete la UI. Ahora se borran
--    también sus objetos. Nota honesta: al borrar la fila de storage.objects
--    el fichero deja de ser servible por la API, que es lo que importa aquí;
--    el binario puede quedar huérfano en el almacén hasta que Storage lo
--    recoja.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-media', 'chat-media', false, 5242880,
        array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Un uuid de verdad en la ruta: sin esto, una carpeta con texto raro haría
-- fallar el cast y con él la política entera.
create or replace function is_uuid(value text)
returns boolean
language sql
immutable
as $$
  select value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
$$;

-- Puede mirar quien esté en esa conversación: miembros de la mesa, o
-- cualquiera de los dos lados del privado.
create policy "chat-media: leer si eres de la conversacion" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-media' and (
      (
        (storage.foldername(name))[1] = 'group'
        and is_uuid((storage.foldername(name))[2])
        and is_group_member(((storage.foldername(name))[2])::uuid)
      )
      or (
        (storage.foldername(name))[1] = 'dm'
        and is_uuid((storage.foldername(name))[2])
        and exists (
          select 1 from dm_threads t
          where t.id = ((storage.foldername(name))[2])::uuid
            and (t.user_lo = auth.uid() or t.user_hi = auth.uid())
        )
      )
    )
  );

-- Y subir, además, solo a su propia carpeta dentro de esa conversación.
create policy "chat-media: subir a lo tuyo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[3] = auth.uid()::text
    and (
      (
        (storage.foldername(name))[1] = 'group'
        and is_uuid((storage.foldername(name))[2])
        and is_group_member(((storage.foldername(name))[2])::uuid)
      )
      or (
        (storage.foldername(name))[1] = 'dm'
        and is_uuid((storage.foldername(name))[2])
        and exists (
          select 1 from dm_threads t
          where t.id = ((storage.foldername(name))[2])::uuid
            and (t.user_lo = auth.uid() or t.user_hi = auth.uid())
        )
      )
    )
  );

create policy "chat-media: borrar lo tuyo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[3] = auth.uid()::text);

-- ============================================================
-- Borrado de cuenta: ahora también sus ficheros
-- ============================================================
create or replace function delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sin sesión';
  end if;
  -- objetos propios: por owner (Storage lo rellena al subir) y por carpeta,
  -- que es como se guardaban antes de que existiera esa columna
  delete from storage.objects
  where bucket_id in ('avatars', 'character-sheets', 'chat-media')
    and (
      owner = v_uid
      or (storage.foldername(name))[1] = v_uid::text
      or (bucket_id = 'chat-media' and (storage.foldername(name))[3] = v_uid::text)
    );
  delete from sessions where created_by = v_uid;
  delete from groups where owner_id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;
