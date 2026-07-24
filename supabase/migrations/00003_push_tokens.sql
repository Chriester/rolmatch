-- Tokens de Expo Push por dispositivo (§8.6 del PRD).
-- En web no hay push: el aviso de match llega por el canal de Discord (el
-- bot menciona a ambos). Esta tabla da servicio a las apps nativas.

create table push_tokens (
  token text primary key, -- ExponentPushToken[...]
  user_id uuid not null references profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on push_tokens (user_id);

alter table push_tokens enable row level security;

create policy "push_tokens: ver los propios" on push_tokens
  for select to authenticated using (auth.uid() = user_id);
create policy "push_tokens: registrar el propio" on push_tokens
  for insert to authenticated with check (auth.uid() = user_id);
create policy "push_tokens: actualizar el propio" on push_tokens
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_tokens: borrar el propio" on push_tokens
  for delete to authenticated using (auth.uid() = user_id);
