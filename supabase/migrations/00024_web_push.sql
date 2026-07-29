-- Suscripciones Web Push (VAPID) para la web y los iPhone/iPad (§8.6 del PRD).
-- iOS no tiene APK: desde iOS 16.4 Safari soporta Web Push si la app está
-- añadida a la pantalla de inicio como PWA. La app guarda aquí la suscripción
-- del navegador; push-notify y push-reminders envían por ambos canales
-- (Expo para APK, Web Push para navegadores).

create table web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique, -- URL del push service del navegador
  p256dh text not null,
  auth text not null,
  updated_at timestamptz not null default now()
);

create index web_push_subscriptions_user_idx on web_push_subscriptions (user_id);

alter table web_push_subscriptions enable row level security;

create policy "web_push: ver las propias" on web_push_subscriptions
  for select to authenticated using (auth.uid() = user_id);
create policy "web_push: registrar la propia" on web_push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "web_push: actualizar la propia" on web_push_subscriptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "web_push: borrar la propia" on web_push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);
