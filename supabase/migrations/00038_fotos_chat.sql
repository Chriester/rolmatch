-- Fotos en el chat (mesa y 1-a-1): nuevo kind 'image' con la URL en
-- media_url. Reutiliza el bucket público avatars (carpeta por usuario),
-- así que no hay políticas de Storage nuevas.

alter table messages drop constraint messages_kind_check;
alter table messages add constraint messages_kind_check
  check (kind in ('text', 'gif', 'sticker', 'roll', 'image'));

alter table messages drop constraint messages_content_check;
alter table messages add constraint messages_content_check check (
  (kind = 'text' and body is not null
    and char_length(btrim(body)) > 0 and char_length(body) <= 2000)
  or (kind = 'gif' and media_url is not null)
  or (kind = 'sticker' and (media_url is not null
    or (body is not null and char_length(body) <= 16)))
  or (kind = 'roll' and body is not null and media_url is not null)
  or (kind = 'image' and media_url is not null)
);

alter table dm_messages drop constraint dm_messages_kind_check;
alter table dm_messages add constraint dm_messages_kind_check
  check (kind in ('text', 'gif', 'sticker', 'roll', 'image'));
