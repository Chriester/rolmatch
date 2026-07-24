-- Canales de Discord POR MESA (no por match): cada mesa tiene su canal de
-- texto y su canal de voz privados en el servidor comunitario. Los nuevos
-- matches se UNEN al canal existente en vez de crear uno nuevo.

alter table groups add column discord_channel_id text;
alter table groups add column discord_voice_channel_id text;
