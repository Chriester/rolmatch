-- Personaje con vida: el personaje deja de ser una ficha estática.
-- (1) Se puede vincular a la mesa donde juega (playing_group_id).
-- (2) Acumula sesiones vividas: cuando su dueño confirma una sesión de esa
--     mesa, el contador sube (trigger sobre session_confirmations, la misma
--     verdad que paga el XP de sesión).
-- (3) Estado nuevo 'fallen' (caído en combate) para el cementerio de la
--     vitrina. En Postgres 12+ ADD VALUE puede ir en la transacción de la
--     migración mientras no se USE el valor en ella (y no se usa).

alter type character_status add value if not exists 'fallen';

alter table characters add column playing_group_id uuid references groups (id) on delete set null;
alter table characters add column sessions_lived int not null default 0;

create or replace function character_session_lived()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update characters c
  set sessions_lived = c.sessions_lived + 1
  where c.user_id = new.user_id
    and c.playing_group_id = (select group_id from sessions where id = new.session_id);
  return new;
end;
$$;

create trigger character_session_lived
  after insert on session_confirmations
  for each row execute function character_session_lived();
