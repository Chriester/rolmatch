-- Likes independientes por personaje: valoración positiva de la comunidad
-- a un personaje concreto (no al jugador). El contador es público.

create table character_likes (
  character_id uuid not null references characters (id) on delete cascade,
  liker_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (character_id, liker_id)
);

alter table character_likes enable row level security;

create policy "character_likes: contadores públicos" on character_likes
  for select to authenticated using (true);
create policy "character_likes: dar el propio" on character_likes
  for insert to authenticated with check (auth.uid() = liker_id);
create policy "character_likes: quitar el propio" on character_likes
  for delete to authenticated using (auth.uid() = liker_id);
