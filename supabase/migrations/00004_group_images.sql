-- Fotos para mesas + limpieza de imágenes propias.
-- profiles.avatar_url y characters.portrait_url ya existen desde 00001;
-- las mesas no tenían imagen.

alter table groups add column image_url text;

-- El bucket avatars (público) aloja todas las imágenes de la app bajo la
-- carpeta del usuario: avatar, fotos de mesa y retratos de personaje.
-- Faltaba la política de borrado para poder reemplazar/limpiar las propias.
create policy "avatars: borrar el propio" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
