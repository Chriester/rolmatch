-- Sistema de XP y niveles (v1, solo cosmético): los usuarios ganan experiencia
-- por acciones reales dentro de la app y suben de nivel con título rolero.
--
-- Regla de oro anti-trampas: el cliente JAMÁS escribe XP. No hay política de
-- insert para authenticated; todo el XP lo otorgan triggers security definer
-- sobre las tablas de verdad (matches, group_members, ratings, histórico…),
-- con topes diarios y eventos únicos para que nada sea farmeable en bucle.
--
-- Requiere la 00015 (group_journal_entries) aplicada antes.

create table xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  amount smallint not null check (amount > 0),
  ref_id uuid, -- entidad origen (match, mesa…) para topes por-referencia
  created_at timestamptz not null default now()
);

create index xp_events_user_idx on xp_events (user_id, created_at desc);
-- Tope diario: contamos eventos del día por usuario+tipo
create index xp_events_cap_idx on xp_events (user_id, kind, created_at desc);
-- Eventos de una sola vez en la vida de la cuenta
create unique index xp_events_once_idx on xp_events (user_id, kind)
  where kind in ('profile_complete', 'first_character', 'first_group');

alter table xp_events enable row level security;

-- Cada uno puede ver su propio historial de XP; nadie inserta desde el cliente.
create policy "xp_events: ver los propios" on xp_events
  for select to authenticated using (auth.uid() = user_id);

-- Total público (igual que profile_reliability): alimenta el nivel/título que
-- se muestra en tarjetas y perfiles de otros jugadores.
create view profile_xp as
select user_id, sum(amount)::int as total_xp
from xp_events
group by user_id;

grant select on profile_xp to authenticated;

-- ============================================================
-- Otorgar XP con topes (la usan solo los triggers)
-- ============================================================
create or replace function grant_xp(
  p_user_id uuid,
  p_kind text,
  p_amount smallint,
  p_ref_id uuid default null,
  p_daily_cap int default 0,      -- 0 = sin tope diario
  p_daily_ref_cap int default 0   -- tope diario por (usuario, tipo, ref)
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_daily_cap > 0 and (
    select count(*) from xp_events
    where user_id = p_user_id and kind = p_kind
      and created_at >= date_trunc('day', now())
  ) >= p_daily_cap then
    return;
  end if;

  if p_daily_ref_cap > 0 and p_ref_id is not null and (
    select count(*) from xp_events
    where user_id = p_user_id and kind = p_kind and ref_id = p_ref_id
      and created_at >= date_trunc('day', now())
  ) >= p_daily_ref_cap then
    return;
  end if;

  insert into xp_events (user_id, kind, amount, ref_id)
  values (p_user_id, p_kind, p_amount, p_ref_id)
  on conflict do nothing; -- respeta los eventos de una sola vez
end;
$$;

-- ============================================================
-- Triggers: los eventos que dan XP
-- ============================================================

-- Perfil completo (una vez): avatar + bio con sustancia
create or replace function xp_on_profile_complete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.avatar_url is not null
     and new.bio is not null and char_length(btrim(new.bio)) >= 20 then
    perform grant_xp(new.id, 'profile_complete', 100::smallint);
  end if;
  return new;
end;
$$;

create trigger xp_profile_complete
  after insert or update on profiles
  for each row execute function xp_on_profile_complete();

-- Primer personaje (una vez)
create or replace function xp_on_character_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform grant_xp(new.user_id, 'first_character', 50::smallint, new.id);
  return new;
end;
$$;

create trigger xp_first_character
  after insert on characters
  for each row execute function xp_on_character_created();

-- Primera mesa creada (una vez)
create or replace function xp_on_group_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform grant_xp(new.owner_id, 'first_group', 80::smallint, new.id);
  return new;
end;
$$;

create trigger xp_first_group
  after insert on groups
  for each row execute function xp_on_group_created();

-- Match: XP para el jugador y para el GM de la mesa (máx. 3/día cada uno)
create or replace function xp_on_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from groups where id = new.group_id;
  perform grant_xp(new.user_id, 'match', 40::smallint, new.id, 3);
  if v_owner is not null then
    perform grant_xp(v_owner, 'match', 40::smallint, new.id, 3);
  end if;
  return new;
end;
$$;

create trigger xp_match
  after insert on matches
  for each row execute function xp_on_match();

-- Unirse a una mesa como jugador (máx. 2/día; el GM ya cobró por crearla)
create or replace function xp_on_group_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.member_role = 'player' then
    perform grant_xp(new.user_id, 'join_group', 60::smallint, new.group_id, 2);
  end if;
  return new;
end;
$$;

create trigger xp_join_group
  after insert on group_members
  for each row execute function xp_on_group_joined();

-- Entrada en el histórico de la mesa: 50 con foto, 30 solo texto.
-- Tope: 1 con XP al día por mesa, 3 al día en total.
create or replace function xp_on_journal_entry()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform grant_xp(
    new.author_id,
    'journal_entry',
    case when new.image_url is not null then 50 else 30 end::smallint,
    new.group_id,
    3,
    1
  );
  return new;
end;
$$;

create trigger xp_journal_entry
  after insert on group_journal_entries
  for each row execute function xp_on_journal_entry();

-- Valorar a un compañero tras jugar (máx. 5/día)
create or replace function xp_on_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform grant_xp(new.rater_id, 'rate_peer', 15::smallint, new.rated_id, 5);
  return new;
end;
$$;

create trigger xp_rating
  after insert on ratings
  for each row execute function xp_on_rating();

-- ============================================================
-- Backfill: la actividad previa cuenta (sin topes; estado, no farmeo)
-- ============================================================
insert into xp_events (user_id, kind, amount)
select id, 'profile_complete', 100 from profiles
where avatar_url is not null and bio is not null and char_length(btrim(bio)) >= 20
on conflict do nothing;

insert into xp_events (user_id, kind, amount, ref_id)
select distinct on (user_id) user_id, 'first_character', 50, id
from characters order by user_id, created_at
on conflict do nothing;

insert into xp_events (user_id, kind, amount, ref_id)
select distinct on (owner_id) owner_id, 'first_group', 80, id
from groups order by owner_id, created_at
on conflict do nothing;

insert into xp_events (user_id, kind, amount, ref_id)
select m.user_id, 'match', 40, m.id from matches m
union all
select g.owner_id, 'match', 40, m.id
from matches m join groups g on g.id = m.group_id
on conflict do nothing;

insert into xp_events (user_id, kind, amount, ref_id)
select user_id, 'join_group', 60, group_id
from group_members where member_role = 'player'
on conflict do nothing;

insert into xp_events (user_id, kind, amount, ref_id)
select author_id, 'journal_entry',
       case when image_url is not null then 50 else 30 end, group_id
from group_journal_entries
on conflict do nothing;

insert into xp_events (user_id, kind, amount, ref_id)
select rater_id, 'rate_peer', 15, rated_id from ratings
on conflict do nothing;
