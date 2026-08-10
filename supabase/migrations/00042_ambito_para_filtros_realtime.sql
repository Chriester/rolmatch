-- Ámbito denormalizado para poder FILTRAR las suscripciones de Realtime.
--
-- Hasta ahora, cada cliente con un chat abierto se suscribía a la tabla
-- message_reactions ENTERA y a las cuatro tablas de votaciones ENTERAS: el
-- servidor le enviaba las reacciones y los votos de toda la plataforma y el
-- cliente descartaba lo que no era suyo. El tráfico crecía con la actividad
-- global multiplicada por usuarios conectados, y cada voto de cualquiera
-- disparaba un refetch en todas las pantallas de organizar abiertas.
--
-- postgres_changes solo sabe filtrar por una columna de la propia tabla, así
-- que aquí se añade esa columna (el grupo o el hilo al que pertenece la
-- fila), se rellena lo existente y se mantiene con un trigger.
--
-- replica identity full: sin ella, un DELETE solo publica la clave primaria,
-- que no incluye la columna nueva, y el filtro descartaría el evento — al
-- quitar una reacción o un voto no se enteraría nadie. messages y dm_messages
-- ya la tenían desde la 00027 por el mismo motivo.

-- ============================================================
-- Reacciones de chat de mesa
-- ============================================================
alter table message_reactions add column if not exists group_id uuid
  references groups (id) on delete cascade;

update message_reactions r
set group_id = m.group_id
from messages m
where m.id = r.message_id and r.group_id is null;

alter table message_reactions alter column group_id set not null;
create index if not exists message_reactions_group_idx on message_reactions (group_id);
alter table message_reactions replica identity full;

create or replace function set_message_reaction_scope()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select m.group_id into new.group_id from messages m where m.id = new.message_id;
  return new;
end;
$$;

drop trigger if exists message_reactions_scope on message_reactions;
create trigger message_reactions_scope
  before insert on message_reactions
  for each row execute function set_message_reaction_scope();

-- ============================================================
-- Reacciones de 1-a-1
-- ============================================================
alter table dm_message_reactions add column if not exists thread_id uuid
  references dm_threads (id) on delete cascade;

update dm_message_reactions r
set thread_id = m.thread_id
from dm_messages m
where m.id = r.message_id and r.thread_id is null;

alter table dm_message_reactions alter column thread_id set not null;
create index if not exists dm_message_reactions_thread_idx on dm_message_reactions (thread_id);
alter table dm_message_reactions replica identity full;

create or replace function set_dm_reaction_scope()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select m.thread_id into new.thread_id from dm_messages m where m.id = new.message_id;
  return new;
end;
$$;

drop trigger if exists dm_message_reactions_scope on dm_message_reactions;
create trigger dm_message_reactions_scope
  before insert on dm_message_reactions
  for each row execute function set_dm_reaction_scope();

-- ============================================================
-- Votaciones: opciones, votos y propuestas (session_polls ya tiene group_id)
-- ============================================================
alter table session_poll_options add column if not exists group_id uuid
  references groups (id) on delete cascade;
alter table session_poll_proposals add column if not exists group_id uuid
  references groups (id) on delete cascade;
alter table session_poll_votes add column if not exists group_id uuid
  references groups (id) on delete cascade;

update session_poll_options o
set group_id = p.group_id
from session_polls p
where p.id = o.poll_id and o.group_id is null;

update session_poll_proposals pr
set group_id = p.group_id
from session_polls p
where p.id = pr.poll_id and pr.group_id is null;

update session_poll_votes v
set group_id = p.group_id
from session_poll_options o
join session_polls p on p.id = o.poll_id
where o.id = v.option_id and v.group_id is null;

alter table session_poll_options alter column group_id set not null;
alter table session_poll_proposals alter column group_id set not null;
alter table session_poll_votes alter column group_id set not null;

create index if not exists session_poll_options_group_idx on session_poll_options (group_id);
create index if not exists session_poll_proposals_group_idx on session_poll_proposals (group_id);
create index if not exists session_poll_votes_group_idx on session_poll_votes (group_id);

alter table session_polls replica identity full;
alter table session_poll_options replica identity full;
alter table session_poll_proposals replica identity full;
alter table session_poll_votes replica identity full;

create or replace function set_poll_child_scope()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select p.group_id into new.group_id from session_polls p where p.id = new.poll_id;
  return new;
end;
$$;

drop trigger if exists session_poll_options_scope on session_poll_options;
create trigger session_poll_options_scope
  before insert on session_poll_options
  for each row execute function set_poll_child_scope();

drop trigger if exists session_poll_proposals_scope on session_poll_proposals;
create trigger session_poll_proposals_scope
  before insert on session_poll_proposals
  for each row execute function set_poll_child_scope();

-- los votos cuelgan de una opción, no de la votación: dos saltos
create or replace function set_poll_vote_scope()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select p.group_id into new.group_id
  from session_poll_options o
  join session_polls p on p.id = o.poll_id
  where o.id = new.option_id;
  return new;
end;
$$;

drop trigger if exists session_poll_votes_scope on session_poll_votes;
create trigger session_poll_votes_scope
  before insert on session_poll_votes
  for each row execute function set_poll_vote_scope();
