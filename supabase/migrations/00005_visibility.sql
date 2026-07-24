-- Visibilidad pública/privada de personajes y hojas.
-- Los personajes públicos forman la vitrina que otros ven (feed, flip de
-- tarjeta); los privados solo los ve su dueño. Las hojas nacen privadas.

alter table characters add column is_public boolean not null default true;
alter table character_sheets add column is_public boolean not null default false;

-- RLS: la visibilidad se aplica en la base de datos, no solo en el cliente
drop policy "characters: visibles para autenticados" on characters;
create policy "characters: públicos o propios" on characters
  for select to authenticated
  using (is_public or user_id = auth.uid());

drop policy "sheets: visibles para autenticados" on character_sheets;
create policy "sheets: públicas o de mis personajes" on character_sheets
  for select to authenticated
  using (
    is_public
    or exists (select 1 from characters c where c.id = character_id and c.user_id = auth.uid())
  );
