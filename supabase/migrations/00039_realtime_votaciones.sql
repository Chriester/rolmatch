-- Votaciones en tiempo real: banners del chat y pantalla Organizar se
-- refrescan solos al crear/cerrar votaciones, votar o proponer fechas.
-- Los bloques do/exception hacen la migración re-ejecutable sin error
-- si alguna tabla ya estuviera en la publication.

do $$
begin
  alter publication supabase_realtime add table public.session_polls;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.session_poll_options;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.session_poll_votes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.session_poll_proposals;
exception when duplicate_object then null;
end $$;
