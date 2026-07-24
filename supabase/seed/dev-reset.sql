-- ============================================================
-- RolMatch · RESET COMPLETO del mundo de prueba (cleanup + seed extendido)
-- ============================================================
-- Un solo script: borra todo lo de @test.rolmatch.local (incluido lo del
-- dev-seed.sql antiguo) y crea un mundo grande para pruebas extensas:
--   · 6 GMs falsos con 8 mesas variadas (sistemas, horarios, estilos,
--     zonas horarias; 5 sin horario definido para que siempre aparezcan)
--   · 8 jugadores falsos (disponibilidades y zonas horarias variadas,
--     los 4 primeros con personajes en vitrina)
--   · Likes pre-armados: 2 mesas ya te han dado like (match instantáneo)
--     y 5 jugadores han dado like a tus mesas (4 proponiendo personaje)
-- Idempotente por diseño (ids deterministas + on conflict), pero al ser
-- un RESET siempre borra y recrea.
-- ============================================================

-- 0. Limpieza (cascada: perfiles, disponibilidad, personajes, swipes, matches)
delete from groups
where owner_id in (select id from auth.users where email like '%@test.rolmatch.local');
delete from auth.users where email like '%@test.rolmatch.local';

-- 1. GMs falsos (6)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  ('11111111-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  'gm' || n || '@test.rolmatch.local',
  crypt('solo-para-dev', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('name', (array[
    'Vecna el Máster', 'Elminster de Cádiz', 'La Cronista', 'Strahd von Zarovich',
    'Keeper Ludovica', 'El Bardo Errante'
  ])[n]),
  now(), now(), '', '', '', ''
from generate_series(1, 6) n
on conflict (id) do nothing;

update profiles p set
  timezone = (array['Europe/Madrid','Europe/Madrid','Atlantic/Canary',
                    'America/Argentina/Buenos_Aires','Europe/Madrid','America/Mexico_City'])[g.n],
  languages = '{es}', role = 'gm',
  bio = 'GM de prueba generado por el seed.'
from generate_series(1, 6) as g(n)
where p.id = ('11111111-0000-4000-8000-' || lpad(g.n::text, 12, '0'))::uuid;

-- 2. Mesas (8): variedad de sistema, formato, horario, estilo y zona horaria
insert into groups (id, owner_id, name, system_id, format, description, language,
                    timezone, session_weekday, session_slot, frequency,
                    experience_wanted, style_combat_narrative, style_serious_humor,
                    style_roleplay_weight, vtt)
select m.id::uuid, ('11111111-0000-4000-8000-' || lpad(m.gm::text, 12, '0'))::uuid,
       m.nombre, s.id, m.formato::group_format, m.descr, 'es', m.tz,
       m.wd, m.slot, m.freq, m.exp::experience_level, m.c, m.h, m.r, m.vtt::vtt_type
from (values
  ('aaaaaaaa-0000-4000-8000-000000000001', 1, 'Los Colmillos de Ankh', 'dnd5e', 'campaign',
   'Campaña de intriga urbana. Nos gusta el roleo entre bambalinas y los planes que salen mal.',
   'Europe/Madrid', null::int, null::int, 'Semanal', null, 40, 60, 70, 'discord_only'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 2, 'La Tumba de la Aniquilación', 'dnd5e', 'campaign',
   'Dungeon crawl letal. Traed personajes de repuesto.',
   'Europe/Madrid', null, null, 'Semanal', 'intermediate', 85, 40, 30, 'foundry'),
  ('aaaaaaaa-0000-4000-8000-000000000003', 3, 'Sombras sobre Arkham', 'cthulhu', 'campaign',
   'Horror clásico años 20. Velas encendidas y cordura en caída libre.',
   'Atlantic/Canary', null, null, 'Quincenal', null, 20, 15, 80, 'roll20'),
  ('aaaaaaaa-0000-4000-8000-000000000004', 4, 'Noches de Buenos Aires', 'vampire', 'campaign',
   'Vampiro con acento porteño. Política, colmillos y tango.',
   'America/Argentina/Buenos_Aires', null, null, 'Semanal', 'beginner', 30, 50, 90, 'discord_only'),
  ('aaaaaaaa-0000-4000-8000-000000000005', 5, 'One-shots del Bardo', 'fate', 'oneshot',
   'Cada sesión una historia distinta. Perfecto para probar la app.',
   'Europe/Madrid', null, null, 'Puntual', null, 50, 80, 50, 'discord_only'),
  ('aaaaaaaa-0000-4000-8000-000000000006', 1, 'Sábados de Pathfinder', 'pathfinder2e', 'campaign',
   'Sesión fija el sábado por la tarde (Madrid). Solo la verás si tu disponibilidad solapa.',
   'Europe/Madrid', 5, 1, 'Semanal', 'intermediate', 70, 45, 40, 'foundry'),
  ('aaaaaaaa-0000-4000-8000-000000000007', 6, 'Domingos de Savage Worlds', 'savage-worlds', 'oneshot',
   'Domingos por la noche hora CDMX. Pulp desenfrenado.',
   'America/Mexico_City', 6, 2, 'Quincenal', null, 60, 70, 35, 'discord_only'),
  ('aaaaaaaa-0000-4000-8000-000000000008', 5, 'Miércoles PbtA', 'pbta', 'campaign',
   'Narrativo puro los miércoles por la noche. Los dados son una excusa.',
   'Europe/Madrid', 2, 2, 'Semanal', null, 10, 55, 85, 'discord_only')
) as m(id, gm, nombre, slug, formato, descr, tz, wd, slot, freq, exp, c, h, r, vtt)
join systems s on s.slug = m.slug
on conflict (id) do nothing;

insert into group_members (group_id, user_id, member_role)
select g.id, g.owner_id, 'gm'
from groups g
where g.owner_id in (select id from auth.users where email like 'gm%@test.rolmatch.local')
on conflict (group_id, user_id) do nothing;

insert into group_openings (id, group_id, seats, requirements)
select md5('opening-' || g.id::text)::uuid, g.id,
       1 + (abs(hashtext(g.id::text)) % 3), 'Buen rollo y ganas de rolear'
from groups g
where g.owner_id in (select id from auth.users where email like 'gm%@test.rolmatch.local')
on conflict (id) do nothing;

-- 3. Jugadores falsos (8)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  ('22222222-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  'jugador' || n || '@test.rolmatch.local',
  crypt('solo-para-dev', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('name', (array[
    'Tasha de Prueba', 'Mordenkainen Jr', 'La Pícara de Triana', 'Bardo sin Laúd',
    'Clériga Nocturna', 'El Explorador Canario', 'Bruja del Río de la Plata', 'Paladín de Chamberí'
  ])[n]),
  now(), now(), '', '', '', ''
from generate_series(1, 8) n
on conflict (id) do nothing;

update profiles p set
  timezone = (array['Europe/Madrid','America/Argentina/Buenos_Aires','Europe/Madrid',
                    'Atlantic/Canary','Europe/Madrid','Atlantic/Canary',
                    'America/Argentina/Buenos_Aires','Europe/Madrid'])[j.n],
  languages = '{es}', role = 'player',
  open_to_any_system = (j.n % 2 = 0),
  bio = (array[
    'Disponible a todas horas y juega a todo. La candidata perfecta.',
    'Desde Buenos Aires, para probar la conversión de zonas horarias.',
    'Rolera de finde: solo viernes a domingo.',
    'Canta mal pero rolea bien. Tardes y noches.',
    'Solo puede de madrugada. Los clérigos también trasnochan.',
    'Desde Canarias, una hora menos y muchas ganas.',
    'Vampiros y maldiciones, preferiblemente de noche.',
    'Nuevo en esto del rol online. Paciencia, por favor.'
  ])[j.n],
  style_combat_narrative = (array[30,80,50,15,60,45,25,70])[j.n],
  style_serious_humor    = (array[60,20,75,90,30,55,40,50])[j.n],
  style_roleplay_weight  = (array[70,40,60,85,50,45,90,30])[j.n]
from generate_series(1, 8) as j(n)
where p.id = ('22222222-0000-4000-8000-' || lpad(j.n::text, 12, '0'))::uuid;

-- Disponibilidad: jugadores 1-4 toda la semana; 5-6 tardes/noches;
-- 7 solo noches y madrugadas; 8 solo fin de semana
insert into availability_slots (user_id, weekday, slot)
select ('22222222-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, wd, s
from generate_series(1, 8) n,
     generate_series(0, 6) wd,
     generate_series(0, 3) s
where (n <= 4)
   or (n in (5, 6) and s in (1, 2))
   or (n = 7 and s in (2, 3))
   or (n = 8 and wd in (4, 5, 6))
on conflict (user_id, weekday, slot) do nothing;

-- Sistemas: todos los jugadores juegan a todo (experiencia variada)
insert into user_systems (user_id, system_id, experience)
select ('22222222-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, s.id,
       (array['beginner','intermediate','veteran'])[1 + (n + s.id) % 3]::experience_level
from generate_series(1, 8) n, systems s
on conflict (user_id, system_id) do nothing;

-- 4. Vitrina: jugadores 1-4 con dos personajes «buscando mesa»
insert into characters (id, user_id, system_id, name, archetype, level, concept, status)
select md5('char-' || n || '-' || k)::uuid,
       ('22222222-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       s.id,
       (array[
         'Karlach la Incandescente','Shadowheart','Gale de Puertavellón','Astarion',
         'Lae''zel','Wyll el Cuchilla','Minsc y Bubú','Jaheira'
       ])[(n - 1) * 2 + k],
       (array['Bárbara','Clériga','Mago','Pícaro','Guerrera','Brujo','Explorador','Druida'])[(n - 1) * 2 + k],
       (2 + n + k)::text,
       'Personaje de prueba con muchas ganas de mesa.',
       'looking'
from generate_series(1, 4) n,
     generate_series(1, 2) k
join systems s on s.slug = case when k = 1 then 'dnd5e' else 'cthulhu' end
on conflict (id) do nothing;

-- 5. Likes pre-armados
-- 5a. Las mesas 1 y 3 ya te han dado like → match instantáneo al swipear
insert into swipes (user_id, group_id, origin, direction)
select p.id, m.gid::uuid, 'group', 'like'
from profiles p,
     (values ('aaaaaaaa-0000-4000-8000-000000000001'),
             ('aaaaaaaa-0000-4000-8000-000000000003')) as m(gid)
where p.discord_id is not null
on conflict (user_id, group_id, origin) do nothing;

-- 5b. Los jugadores 1-5 dan like a TODAS tus mesas (1-4 proponen personaje)
--     → aparecen primero en «Candidatos» con el badge 💘
insert into swipes (user_id, group_id, origin, direction, proposed_character_id)
select ('22222222-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       g.id, 'user', 'like',
       case when n <= 4 then md5('char-' || n || '-1')::uuid end
from generate_series(1, 5) n,
     groups g
where g.owner_id in (select id from profiles where discord_id is not null)
on conflict (user_id, group_id, origin) do nothing;
