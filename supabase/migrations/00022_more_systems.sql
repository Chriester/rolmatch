-- El handoff de hojas de personaje incluye Blades in the Dark y Cyberpunk
-- RED: entran al catálogo de sistemas (el matching los trata como a todos).

insert into systems (slug, name) values
  ('blades', 'Blades in the Dark'),
  ('cyberpunk-red', 'Cyberpunk RED')
on conflict (slug) do nothing;
