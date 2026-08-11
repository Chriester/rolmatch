-- Resumen de «Mis chats» calculado en la base de datos.
--
-- Antes el cliente pedía los 200 mensajes más recientes de TODAS mis mesas
-- juntas y deducía de ahí el último mensaje y los no leídos de cada una. El
-- límite era global, no por mesa: si una mesa activa acaparaba esos 200, el
-- resto salían sin último mensaje y con CERO no leídos aunque los tuvieran.
-- Con 3-4 mesas vivas ya pasaba. Lo mismo en los 1-a-1.
--
-- Estas dos funciones devuelven una fila por conversación con el último
-- mensaje y la cuenta exacta de no leídos, en una sola consulta. Van como
-- SECURITY INVOKER a propósito: la RLS sigue mandando, así que nadie puede
-- leer resúmenes de conversaciones ajenas. Los índices que necesitan ya
-- existen (messages_group_created_idx, dm_messages_thread_created_idx).
--
-- La cuenta de no leídos se corta a 100 filas: la UI enseña «99+».

create or replace function chat_summaries()
returns table (
  group_id uuid,
  last_body text,
  last_kind text,
  last_sender text,
  last_created_at timestamptz,
  unread integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with mine as (
    select gm.group_id from group_members gm where gm.user_id = auth.uid()
  ),
  last_msg as (
    select distinct on (m.group_id)
      m.group_id, m.body, m.kind, m.sender_id, m.created_at
    from messages m
    where m.group_id in (select group_id from mine)
    order by m.group_id, m.created_at desc
  )
  select
    mine.group_id,
    lm.body,
    lm.kind,
    p.alias,
    lm.created_at,
    (
      select count(*) from (
        select 1 from messages m2
        where m2.group_id = mine.group_id
          and m2.sender_id <> auth.uid()
          and m2.created_at > coalesce(
            (select cr.last_read_at from chat_reads cr
              where cr.group_id = mine.group_id and cr.user_id = auth.uid()),
            '-infinity'::timestamptz
          )
        limit 100
      ) capped
    )::int
  from mine
  left join last_msg lm on lm.group_id = mine.group_id
  left join profiles p on p.id = lm.sender_id;
$$;

create or replace function dm_summaries()
returns table (
  thread_id uuid,
  other_id uuid,
  other_alias text,
  other_avatar_url text,
  last_body text,
  last_kind text,
  last_created_at timestamptz,
  unread integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with mine as (
    select
      t.id as thread_id,
      case when t.user_lo = auth.uid() then t.user_hi else t.user_lo end as other_id
    from dm_threads t
    where t.user_lo = auth.uid() or t.user_hi = auth.uid()
  ),
  last_msg as (
    select distinct on (m.thread_id)
      m.thread_id, m.body, m.kind, m.created_at
    from dm_messages m
    where m.thread_id in (select thread_id from mine)
    order by m.thread_id, m.created_at desc
  )
  select
    mine.thread_id,
    mine.other_id,
    p.alias,
    p.avatar_url,
    lm.body,
    lm.kind,
    lm.created_at,
    (
      select count(*) from (
        select 1 from dm_messages m2
        where m2.thread_id = mine.thread_id
          and m2.sender_id <> auth.uid()
          and m2.created_at > coalesce(
            (select r.last_read_at from dm_reads r
              where r.thread_id = mine.thread_id and r.user_id = auth.uid()),
            '-infinity'::timestamptz
          )
        limit 100
      ) capped
    )::int
  from mine
  left join last_msg lm on lm.thread_id = mine.thread_id
  left join profiles p on p.id = mine.other_id;
$$;

revoke execute on function chat_summaries() from public;
revoke execute on function dm_summaries() from public;
grant execute on function chat_summaries() to authenticated;
grant execute on function dm_summaries() to authenticated;
