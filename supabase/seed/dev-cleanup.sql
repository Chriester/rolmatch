-- ============================================================
-- RolMatch · limpieza de los datos de prueba de dev-seed.sql
-- ============================================================
-- Borra todo lo creado por el seed (mesas, swipes y matches incluidos).
-- Los swipes/matches de tus mesas hechos por los jugadores falsos caen
-- en cascada al borrar sus usuarios.

-- Las mesas del GM falso no caen en cascada (owner_id no tiene cascade)
delete from groups
where owner_id in (select id from auth.users where email like '%@test.rolmatch.local');

-- Borrar los usuarios falsos arrastra perfiles, disponibilidad, sistemas,
-- swipes y matches asociados
delete from auth.users where email like '%@test.rolmatch.local';
