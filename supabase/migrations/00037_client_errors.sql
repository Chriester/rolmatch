-- Registro de errores del cliente: el ErrorBoundary (y quien quiera) escribe
-- aquí los crashes con contexto. Moderación los consulta con un select —
-- adiós a pedir capturas del error a los testers (y a cazar fantasmas a
-- ciegas, como el pantallazo blanco intermitente).

create table client_errors (
  id bigint generated always as identity primary key,
  user_id uuid references profiles (id) on delete set null,
  message text not null,
  stack text,
  route text,
  platform text,
  build text,
  created_at timestamptz not null default now()
);

create index client_errors_created_idx on client_errors (created_at desc);

alter table client_errors enable row level security;

create policy "client_errors: reporta cualquier autenticado" on client_errors
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "client_errors: los lee moderacion" on client_errors
  for select to authenticated
  using (exists (
    select 1 from profiles p where p.id = auth.uid() and p.is_moderator
  ));
