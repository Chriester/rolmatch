-- XP v1.5 — sesión confirmada por quórum + higiene anti-farmeo.
--
-- (1) El evento gordo de XP: una sesión del calendario (00009) ya jugada se
--     confirma por los miembros; cuando 3 personas DISTINTAS de la mesa
--     confirman, todos los confirmantes cobran. Falsearlo exige mantener una
--     mesa con sesiones programadas y coordinar 3 cuentas cada vez.
-- (2) Rendimientos decrecientes por contrapartida: repetir el mismo evento
--     con la misma persona da la mitad cada vez y nada a la 4ª.
-- (3) Las cuentas sin madurar (perfil incompleto o <2 días) no generan XP
--     para otros — mata las cuentas desechables.
-- (4) Techo semanal global de XP: limita el daño de cualquier exploit.

alter table xp_events add column counterpart_id uuid references profiles (id) on delete set null;

-- Cada confirmante cobra una sesión como mucho una vez en la vida
create unique index xp_events_session_once_idx on xp_events (user_id, kind, ref_id)
  where kind = 'session_played';

-- ============================================================
-- Confirmaciones de sesión
-- ============================================================
create table session_confirmations (
  session_id uuid not null references sessions (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table session_confirmations enable row level security;

create policy "session_confirmations: ven los miembros de la mesa" on session_confirmations
  for select to authenticated
  using (
    exists (
      select 1 from sessions s
      join group_members gm on gm.group_id = s.group_id
      where s.id = session_id and gm.user_id = auth.uid()
    )
  );

-- Solo miembros, solo la propia, solo sesiones ya empezadas y de hace <7 días
create policy "session_confirmations: confirmar la propia" on session_confirmations
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from sessions s
      join group_members gm on gm.group_id = s.group_id and gm.user_id = auth.uid()
      where s.id = session_id
        and s.starts_at <= now()
        and s.starts_at >= now() - interval '7 days'
    )
  );

-- ============================================================
-- grant_xp v2: techo semanal + contrapartida (madurez + decrecimiento)
-- ============================================================
drop function if exists grant_xp(uuid, text, smallint, uuid, int, int);

create or replace function grant_xp(
  p_user_id uuid,
  p_kind text,
  p_amount smallint,
  p_ref_id uuid default null,
  p_daily_cap int default 0,      -- 0 = sin tope diario
  p_daily_ref_cap int default 0,  -- tope diario por (usuario, tipo, ref)
  p_counterpart uuid default null -- la otra persona del evento, si la hay
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_amount int := p_amount;
  v_prior int;
begin
  -- Techo semanal global (semana natural)
  if (
    select coalesce(sum(amount), 0) from xp_events
    where user_id = p_user_id and created_at >= date_trunc('week', now())
  ) >= 1000 then
    return;
  end if;

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

  if p_counterpart is not null then
    -- La contrapartida debe ser una cuenta madura con perfil completo
    if not exists (
      select 1 from profiles p
      where p.id = p_counterpart
        and p.avatar_url is not null
        and p.bio is not null and char_length(btrim(p.bio)) >= 20
        and p.created_at <= now() - interval '2 days'
    ) then
      return;
    end if;

    -- Rendimientos decrecientes: mitad por repetición, nada a la 4ª
    select count(*) into v_prior from xp_events
    where user_id = p_user_id and kind = p_kind and counterpart_id = p_counterpart;
    if v_prior >= 3 then
      return;
    end if;
    v_amount := p_amount::int >> v_prior;
  end if;

  insert into xp_events (user_id, kind, amount, ref_id, counterpart_id)
  values (p_user_id, p_kind, v_amount::smallint, p_ref_id, p_counterpart)
  on conflict do nothing; -- respeta los eventos únicos
end;
$$;

-- ============================================================
-- Triggers que ahora pasan contrapartida
-- ============================================================

-- Match: el jugador cobra con el GM de contrapartida y viceversa
create or replace function xp_on_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from groups where id = new.group_id;
  perform grant_xp(new.user_id, 'match', 40::smallint, new.id, 3, 0, v_owner);
  if v_owner is not null then
    perform grant_xp(v_owner, 'match', 40::smallint, new.id, 3, 0, new.user_id);
  end if;
  return new;
end;
$$;

-- Unirse a una mesa: el dueño de la mesa es la contrapartida
create or replace function xp_on_group_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  if new.member_role = 'player' then
    select owner_id into v_owner from groups where id = new.group_id;
    perform grant_xp(new.user_id, 'join_group', 60::smallint, new.group_id, 2, 0, v_owner);
  end if;
  return new;
end;
$$;

-- Valorar: la persona valorada es la contrapartida
create or replace function xp_on_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform grant_xp(new.rater_id, 'rate_peer', 15::smallint, new.rated_id, 5, 0, new.rated_id);
  return new;
end;
$$;

-- ============================================================
-- Sesión confirmada: al llegar al quórum cobran todos los confirmantes
-- ============================================================
create or replace function xp_on_session_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
  v_confirmer uuid;
begin
  select count(*) into v_count
  from session_confirmations where session_id = new.session_id;

  -- Quórum de 3: el índice único evita dobles cobros y los confirmantes
  -- tardíos (4º en adelante) cobran con su propia inserción.
  if v_count >= 3 then
    for v_confirmer in
      select user_id from session_confirmations where session_id = new.session_id
    loop
      perform grant_xp(v_confirmer, 'session_played', 150::smallint, new.session_id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger xp_session_confirmed
  after insert on session_confirmations
  for each row execute function xp_on_session_confirmed();
