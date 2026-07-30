-- Misiones nuevas de XP (pantalla «Mi nivel» → misiones y recompensas):
-- 1. character_complete (una vez, +75): un personaje con retrato, sistema,
--    clase y concepto — la vitrina de verdad, no el cascarón.
-- 2. notifications_on (una vez, +40): activar notificaciones (registrar
--    token Expo en el APK o suscripción web push).
-- El cliente sigue sin poder escribir XP: triggers security definer.

-- El índice de eventos únicos crece con los dos kinds nuevos
drop index xp_events_once_idx;
create unique index xp_events_once_idx on xp_events (user_id, kind)
  where kind in (
    'profile_complete', 'first_character', 'first_group',
    'character_complete', 'notifications_on'
  );

-- Personaje completo (una vez)
create or replace function xp_on_character_complete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.portrait_url is not null
     and new.system_id is not null
     and new.archetype is not null and char_length(btrim(new.archetype)) > 0
     and new.concept is not null and char_length(btrim(new.concept)) > 0 then
    perform grant_xp(new.user_id, 'character_complete', 75::smallint);
  end if;
  return new;
end;
$$;

create trigger xp_character_complete
  after insert or update on characters
  for each row execute function xp_on_character_complete();

-- Notificaciones activadas (una vez, por cualquiera de los dos canales)
create or replace function xp_on_notifications()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform grant_xp(new.user_id, 'notifications_on', 40::smallint);
  return new;
end;
$$;

create trigger xp_notifications_token
  after insert on push_tokens
  for each row execute function xp_on_notifications();

create trigger xp_notifications_web
  after insert on web_push_subscriptions
  for each row execute function xp_on_notifications();

-- Backfill: lo ya hecho cuenta
insert into xp_events (user_id, kind, amount)
select distinct user_id, 'character_complete', 75 from characters
where portrait_url is not null and system_id is not null
  and archetype is not null and char_length(btrim(archetype)) > 0
  and concept is not null and char_length(btrim(concept)) > 0
on conflict do nothing;

insert into xp_events (user_id, kind, amount)
select distinct user_id, 'notifications_on', 40 from (
  select user_id from push_tokens
  union
  select user_id from web_push_subscriptions
) as activados
on conflict do nothing;
