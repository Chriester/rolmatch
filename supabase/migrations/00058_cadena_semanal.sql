-- Cadena semanal: misiones ancladas al latido real del producto (la sesión),
-- sin rachas artificiales. Completar en la misma semana natural las cuatro
-- piezas del ciclo de jugar — responder a una convocatoria (RSVP), confirmar
-- una sesión jugada, escribir crónica en el histórico y valorar a un
-- compañero — da un bonus de 100 XP. Cada pieza ya paga su propio XP; esto
-- premia cerrar el ciclo completo.
--
-- Pasa por grant_xp: respeta el techo semanal global de 1000 XP (00017), y
-- el índice único de abajo hace el resto (una cadena por semana como mucho).

create unique index xp_events_weekly_chain_idx
  on xp_events (user_id, (date_trunc('week', created_at)))
  where kind = 'weekly_chain';

create or replace function maybe_grant_weekly_chain(p_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_week timestamptz := date_trunc('week', now());
begin
  if exists (
       select 1 from session_rsvps
       where user_id = p_user and created_at >= v_week
     )
     and exists (
       select 1 from session_confirmations
       where user_id = p_user and created_at >= v_week
     )
     and exists (
       select 1 from group_journal_entries
       where author_id = p_user and created_at >= v_week
     )
     and exists (
       select 1 from ratings
       where rater_id = p_user and created_at >= v_week
     )
  then
    perform grant_xp(p_user, 'weekly_chain', 100::smallint);
  end if;
end;
$$;

-- Un solo trigger reutilizable: la columna con el usuario va como argumento
create or replace function xp_weekly_chain_check()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform maybe_grant_weekly_chain((to_jsonb(new) ->> TG_ARGV[0])::uuid);
  return new;
end;
$$;

create trigger chain_rsvp
  after insert on session_rsvps
  for each row execute function xp_weekly_chain_check('user_id');

create trigger chain_confirmation
  after insert on session_confirmations
  for each row execute function xp_weekly_chain_check('user_id');

create trigger chain_journal
  after insert on group_journal_entries
  for each row execute function xp_weekly_chain_check('author_id');

create trigger chain_rating
  after insert on ratings
  for each row execute function xp_weekly_chain_check('rater_id');
