-- Mini-hoja de personaje por sistema: rasgos flexibles (clan, raza, clase…)
-- en jsonb según el esquema del sistema (src/lib/sheet-schema.ts), y el
-- diseño visual de hoja elegido (con hueco para diseños premium/por nivel).

alter table characters
  add column traits jsonb not null default '{}'::jsonb,
  add column sheet_theme text;
