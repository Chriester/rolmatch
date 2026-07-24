-- RolMatch — esquema inicial (Fase 1 + tablas de fases 2-3 que no requieren migración posterior)
-- Convenciones: snake_case, RLS activado en todas las tablas, timestamps con timezone.

-- ============================================================
-- Enums
-- ============================================================
create type user_role as enum ('player', 'gm', 'both');
create type experience_level as enum ('none', 'beginner', 'intermediate', 'veteran');
create type character_status as enum ('looking', 'playing', 'retired');
create type group_format as enum ('campaign', 'oneshot');
create type vtt_type as enum ('roll20', 'foundry', 'discord_only', 'other');
create type swipe_direction as enum ('like', 'pass');
create type swipe_origin as enum ('user', 'group'); -- quién hizo el swipe
create type match_status as enum ('active', 'closed');
create type report_status as enum ('open', 'reviewed', 'actioned');
create type member_role as enum ('gm', 'player');

-- ============================================================
-- Perfiles de persona (§4.1) — extiende auth.users
-- ============================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  alias text not null,
  avatar_url text,
  bio text,
  timezone text not null default 'UTC', -- IANA, p. ej. 'Europe/Madrid'
  role user_role not null default 'player',
  languages text[] not null default '{es}',
  -- Estilo de juego: sliders 0-100 (§4.1)
  style_combat_narrative smallint not null default 50 check (style_combat_narrative between 0 and 100),
  style_serious_humor smallint not null default 50 check (style_serious_humor between 0 and 100),
  style_roleplay_weight smallint not null default 50 check (style_roleplay_weight between 0 and 100),
  -- Preferencias técnicas
  voice_chat boolean not null default true,
  camera_ok boolean not null default false,
  preferred_vtt vtt_type not null default 'discord_only',
  -- Discord (identidad verificada, §6)
  discord_id text unique,
  discord_username text,
  safety_tools text[] not null default '{}',
  open_to_any_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Disponibilidad semanal: matriz día × franja en hora LOCAL del usuario.
-- El matching convierte a UTC con profiles.timezone (filtro duro nº 1, §7).
create table availability_slots (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = lunes
  slot smallint not null check (slot between 0 and 3),       -- 0 mañana, 1 tarde, 2 noche, 3 madrugada
  unique (user_id, weekday, slot)
);

-- ============================================================
-- Sistemas de juego
-- ============================================================
create table systems (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null
);

insert into systems (slug, name) values
  ('dnd5e', 'Dungeons & Dragons 5e'),
  ('pathfinder2e', 'Pathfinder 2e'),
  ('cthulhu', 'La Llamada de Cthulhu'),
  ('vampire', 'Vampiro: La Mascarada'),
  ('savage-worlds', 'Savage Worlds'),
  ('fate', 'FATE'),
  ('pbta', 'Powered by the Apocalypse'),
  ('other', 'Otro / indie');

create table user_systems (
  user_id uuid not null references profiles (id) on delete cascade,
  system_id smallint not null references systems (id) on delete cascade,
  experience experience_level not null default 'beginner',
  can_gm boolean not null default false,
  primary key (user_id, system_id)
);

-- ============================================================
-- Personajes (§4.2, Fase 2)
-- ============================================================
create table characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  system_id smallint references systems (id),
  name text not null,
  archetype text,          -- clase/arquetipo
  level text,              -- texto libre: "5", "Sire", etc.
  portrait_url text,
  concept text,            -- 1-2 frases
  backstory text,
  status character_status not null default 'looking',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hoja adjunta (§8.5). parsed_data queda vacío hasta la fase 4 (extracción con IA).
create table character_sheets (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters (id) on delete cascade,
  storage_path text not null, -- bucket character-sheets
  mime_type text not null,
  parsed_data jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default now()
);

-- ============================================================
-- Grupos (§4.3, núcleo)
-- ============================================================
create table groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id),
  name text not null,
  system_id smallint references systems (id),
  format group_format not null default 'campaign',
  description text,
  language text not null default 'es',
  timezone text not null default 'UTC',
  session_weekday smallint check (session_weekday between 0 and 6),
  session_slot smallint check (session_slot between 0 and 3),
  frequency text, -- "semanal", "quincenal"…
  experience_wanted experience_level,
  style_combat_narrative smallint not null default 50 check (style_combat_narrative between 0 and 100),
  style_serious_humor smallint not null default 50 check (style_serious_humor between 0 and 100),
  style_roleplay_weight smallint not null default 50 check (style_roleplay_weight between 0 and 100),
  vtt vtt_type not null default 'discord_only',
  discord_invite_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  member_role member_role not null default 'player',
  character_id uuid references characters (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table group_openings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  seats smallint not null default 1 check (seats > 0),
  requirements text,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Swipes y matches (usuario ↔ grupo, bidireccional §4.3)
-- ============================================================
create table swipes (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  origin swipe_origin not null, -- 'user': el jugador swipea al grupo; 'group': el grupo al jugador
  direction swipe_direction not null,
  proposed_character_id uuid references characters (id) on delete set null, -- Fase 2
  created_at timestamptz not null default now(),
  unique (user_id, group_id, origin)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  status match_status not null default 'active',
  discord_channel_id text, -- lo rellena el bot al crear el canal (§6)
  matched_at timestamptz not null default now(),
  unique (user_id, group_id)
);

-- Match automático cuando ambas partes dieron 'like'
create or replace function handle_reciprocal_swipe()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.direction = 'like' and exists (
    select 1 from swipes s
    where s.user_id = new.user_id
      and s.group_id = new.group_id
      and s.origin <> new.origin
      and s.direction = 'like'
  ) then
    insert into matches (user_id, group_id)
    values (new.user_id, new.group_id)
    on conflict (user_id, group_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_reciprocal_swipe
  after insert on swipes
  for each row execute function handle_reciprocal_swipe();

-- ============================================================
-- Moderación y valoraciones (§ Fase 1 y 3)
-- ============================================================
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  reported_user_id uuid references profiles (id) on delete cascade,
  reported_group_id uuid references groups (id) on delete cascade,
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  check (reported_user_id is not null or reported_group_id is not null)
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references profiles (id) on delete cascade,
  rated_id uuid not null references profiles (id) on delete cascade,
  group_id uuid references groups (id) on delete set null,
  reliability smallint not null check (reliability between 1 and 5),
  attended boolean not null default true,
  comment text,
  created_at timestamptz not null default now(),
  check (rater_id <> rated_id)
);

-- ============================================================
-- Trigger: crear perfil al registrarse (Discord OAuth o email)
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, alias, avatar_url, discord_id, discord_username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Jugador'),
    new.raw_user_meta_data ->> 'avatar_url',
    case when new.raw_app_meta_data ->> 'provider' = 'discord' then new.raw_user_meta_data ->> 'provider_id' end,
    case when new.raw_app_meta_data ->> 'provider' = 'discord' then new.raw_user_meta_data ->> 'name' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger characters_updated_at before update on characters
  for each row execute function set_updated_at();
create trigger groups_updated_at before update on groups
  for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security (desde el día 1, §8.2)
-- ============================================================
alter table profiles enable row level security;
alter table availability_slots enable row level security;
alter table systems enable row level security;
alter table user_systems enable row level security;
alter table characters enable row level security;
alter table character_sheets enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_openings enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table reports enable row level security;
alter table ratings enable row level security;

-- Perfiles y datos públicos de matchmaking: visibles para usuarios autenticados
create policy "profiles: visibles para autenticados" on profiles
  for select to authenticated using (true);
create policy "profiles: editar el propio" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "availability: visibles para autenticados" on availability_slots
  for select to authenticated using (true);
create policy "availability: gestionar la propia" on availability_slots
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "systems: lectura pública" on systems
  for select to authenticated using (true);

create policy "user_systems: visibles para autenticados" on user_systems
  for select to authenticated using (true);
create policy "user_systems: gestionar los propios" on user_systems
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "characters: visibles para autenticados" on characters
  for select to authenticated using (true);
create policy "characters: gestionar los propios" on characters
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sheets: visibles para autenticados" on character_sheets
  for select to authenticated using (true);
create policy "sheets: gestionar las de mis personajes" on character_sheets
  for all to authenticated
  using (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()))
  with check (exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid()));

create policy "groups: activos visibles para autenticados" on groups
  for select to authenticated using (is_active or owner_id = auth.uid());
create policy "groups: crear siendo dueño" on groups
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "groups: editar el dueño" on groups
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "groups: borrar el dueño" on groups
  for delete to authenticated using (auth.uid() = owner_id);

create policy "group_members: visibles para autenticados" on group_members
  for select to authenticated using (true);
create policy "group_members: gestiona el dueño del grupo" on group_members
  for all to authenticated
  using (exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "group_members: salir del grupo" on group_members
  for delete to authenticated using (auth.uid() = user_id);

create policy "openings: visibles para autenticados" on group_openings
  for select to authenticated using (true);
create policy "openings: gestiona el dueño del grupo" on group_openings
  for all to authenticated
  using (exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid()));

-- Swipes: cada parte inserta los suyos; solo ves los que te involucran
create policy "swipes: ver los que me involucran" on swipes
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
  );
create policy "swipes: jugador swipea a grupo" on swipes
  for insert to authenticated
  with check (origin = 'user' and auth.uid() = user_id);
create policy "swipes: dueño del grupo swipea a jugador" on swipes
  for insert to authenticated
  with check (
    origin = 'group'
    and exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "matches: ver los que me involucran" on matches
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- Reports: solo insertar; la lectura queda para el service role (moderación)
create policy "reports: crear el propio" on reports
  for insert to authenticated with check (auth.uid() = reporter_id);

create policy "ratings: ver las que me involucran" on ratings
  for select to authenticated using (auth.uid() = rater_id or auth.uid() = rated_id);
create policy "ratings: crear la propia" on ratings
  for insert to authenticated with check (auth.uid() = rater_id);

-- ============================================================
-- Storage: buckets de avatares y hojas de personaje
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('character-sheets', 'character-sheets', false, 5242880, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: lectura pública" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars: subir el propio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: actualizar el propio" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "sheets: lectura autenticada" on storage.objects
  for select to authenticated using (bucket_id = 'character-sheets');
create policy "sheets: subir la propia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'character-sheets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sheets: borrar la propia" on storage.objects
  for delete to authenticated
  using (bucket_id = 'character-sheets' and (storage.foldername(name))[1] = auth.uid()::text);
