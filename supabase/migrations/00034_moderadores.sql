-- Moderadores por columna: el aviso de reports localizaba a moderación por
-- email vía la API admin y fallaba en silencio. profiles.is_moderator es
-- robusto (sobrevive a resets de cuenta re-marcando una fila), soporta
-- varios moderadores y no depende de la API admin. Protegido contra
-- auto-concesión con el mismo patrón que el premium (00010).
--
-- Para marcar moderadores (solo SQL Editor):
--   update profiles set is_moderator = true where alias = '<tu alias>';

alter table profiles add column is_moderator boolean not null default false;

create or replace function protect_moderator_column()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and new.is_moderator is distinct from old.is_moderator then
    raise exception 'is_moderator solo se gestiona por el sistema';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_moderator before update on profiles
  for each row execute function protect_moderator_column();
