-- Tiradas de dados en el chat: nuevo kind 'roll' en messages y dm_messages.
-- body lleva el resumen legible («🎲 2d6+3 = 9 (4, 2)» — así previews y
-- pushes funcionan sin tocar nada) y media_url el JSON de la tirada para
-- pintar la burbuja especial.

alter table messages drop constraint messages_kind_check;
alter table messages add constraint messages_kind_check
  check (kind in ('text', 'gif', 'sticker', 'roll'));

alter table messages drop constraint messages_content_check;
alter table messages add constraint messages_content_check check (
  (kind = 'text' and body is not null
    and char_length(btrim(body)) > 0 and char_length(body) <= 2000)
  or (kind = 'gif' and media_url is not null)
  or (kind = 'sticker' and (media_url is not null
    or (body is not null and char_length(body) <= 16)))
  or (kind = 'roll' and body is not null and media_url is not null)
);

alter table dm_messages drop constraint dm_messages_kind_check;
alter table dm_messages add constraint dm_messages_kind_check
  check (kind in ('text', 'gif', 'sticker', 'roll'));
