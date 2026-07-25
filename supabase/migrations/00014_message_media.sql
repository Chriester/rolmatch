-- Mensajes con media en el chat: GIFs (URL de Tenor, sin storage propio)
-- y stickers (de momento emoji grande en body; media_url queda listo para
-- packs de arte propios en el futuro). El texto sigue siendo el caso base.

alter table messages
  add column kind text not null default 'text' check (kind in ('text', 'gif', 'sticker')),
  add column media_url text;

-- El body pasa a ser opcional (un GIF no lleva texto); la coherencia
-- por tipo la garantiza el check nuevo.
alter table messages drop constraint if exists messages_body_check;
alter table messages alter column body drop not null;

alter table messages add constraint messages_content_check check (
  (kind = 'text' and body is not null
    and char_length(btrim(body)) > 0 and char_length(body) <= 2000)
  or (kind = 'gif' and media_url is not null)
  or (kind = 'sticker' and (media_url is not null
    or (body is not null and char_length(body) <= 16)))
);
