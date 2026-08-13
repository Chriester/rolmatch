-- Cosméticos por nivel (marcos de tarjeta y flair de avatar): el nivel deja
-- de ser solo un número y compra apariencia. El catálogo y los requisitos de
-- nivel viven en el cliente (src/lib/cosmetics.ts, patrón SHEET_THEMES);
-- aquí solo se guarda la elección. Anti-trampas: quien pinta la tarjeta
-- valida el nivel del dueño contra profile_xp (público), así que equipar un
-- id sin nivel suficiente simplemente no se muestra.

alter table profiles add column card_frame text;
alter table profiles add column avatar_flair text;
