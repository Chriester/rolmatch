-- ============================================================
-- RolMatch · datos de prueba para desarrollo (SOLO entornos dev)
-- ============================================================
-- Crea 3 usuarios falsos (1 GM + 2 jugadores), 2 mesas de prueba y los
-- swipes necesarios para poder probar el circuito de match con UNA sola
-- cuenta real. Es idempotente: se puede ejecutar varias veces.
--
-- Uso: pegar entero en el SQL Editor de Supabase y Run.
--   1ª vez: crea el mundo de prueba. Tu usuario real (detectado por tener
--   discord_id) ya recibe un like de la "Mesa de prueba", así que darle a
--   "Me interesa" en el feed produce match instantáneo.
--   Si creas una mesa propia DESPUÉS, vuelve a ejecutarlo: los jugadores
--   falsos darán like a tus mesas y aparecerán como candidatos.
--
-- Limpieza: supabase/seed/dev-cleanup.sql
-- ============================================================

-- 1. Usuarios falsos en auth.users (el trigger crea sus profiles)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'gm.prueba@test.rolmatch.local',
   crypt('solo-para-dev', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Vecna el Máster"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'jugadora.prueba1@test.rolmatch.local',
   crypt('solo-para-dev', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Tasha de Prueba"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333',
   'authenticated', 'authenticated', 'jugador.prueba2@test.rolmatch.local',
   crypt('solo-para-dev', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Mordenkainen Jr"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- 2. Perfiles completos (zona horaria de Madrid, español, estilos variados)
update profiles set
  timezone = 'Europe/Madrid',
  languages = '{es}',
  role = 'gm',
  bio = 'Máster de prueba generado por el seed de desarrollo.',
  style_combat_narrative = 50, style_serious_humor = 50, style_roleplay_weight = 50
where id = '11111111-1111-4111-8111-111111111111';

update profiles set
  timezone = 'Europe/Madrid',
  languages = '{es}',
  role = 'player',
  bio = 'Jugadora de prueba: disponible a todas horas y juega a todo.',
  open_to_any_system = true,
  style_combat_narrative = 30, style_serious_humor = 60, style_roleplay_weight = 70
where id = '22222222-2222-4222-8222-222222222222';

update profiles set
  timezone = 'America/Argentina/Buenos_Aires',
  languages = '{es}',
  role = 'player',
  bio = 'Jugador de prueba desde Buenos Aires, para probar zonas horarias.',
  style_combat_narrative = 80, style_serious_humor = 20, style_roleplay_weight = 40
where id = '33333333-3333-4333-8333-333333333333';

-- 3. Disponibilidad: los jugadores falsos están libres TODA la semana
--    (así pasan el filtro duro contra cualquier mesa que crees)
insert into availability_slots (user_id, weekday, slot)
select u.id, wd, s
from (values ('22222222-2222-4222-8222-222222222222'::uuid),
             ('33333333-3333-4333-8333-333333333333'::uuid)) as u(id),
     generate_series(0, 6) wd, generate_series(0, 3) s
on conflict (user_id, weekday, slot) do nothing;

-- El GM falso solo juega sábado tarde y domingo noche
insert into availability_slots (user_id, weekday, slot)
values
  ('11111111-1111-4111-8111-111111111111', 5, 1),
  ('11111111-1111-4111-8111-111111111111', 6, 2)
on conflict (user_id, weekday, slot) do nothing;

-- 4. Sistemas: los jugadores falsos juegan a todo (nivel intermedio)
insert into user_systems (user_id, system_id, experience)
select u.id, s.id, 'intermediate'::experience_level
from (values ('22222222-2222-4222-8222-222222222222'::uuid),
             ('33333333-3333-4333-8333-333333333333'::uuid)) as u(id),
     systems s
on conflict (user_id, system_id) do nothing;

insert into user_systems (user_id, system_id, experience)
select '11111111-1111-4111-8111-111111111111', id, 'veteran'::experience_level
from systems where slug = 'dnd5e'
on conflict (user_id, system_id) do nothing;

-- 5. Mesas de prueba del GM falso
--    Mesa 1 SIN horario definido: aparece en tu feed pase lo que pase.
--    Mesa 2 el sábado por la tarde (Madrid): solo la verás si tu
--    disponibilidad solapa — sirve para comprobar el filtro duro.
insert into groups (id, owner_id, name, system_id, format, description, language,
                    timezone, session_weekday, session_slot, frequency, vtt)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
       'Mesa de prueba — Los Colmillos de Ankh', s.id, 'campaign',
       'Mesa generada por el seed de desarrollo. Sin horario definido para que siempre aparezca en el feed.',
       'es', 'Europe/Madrid', null, null, 'Semanal', 'discord_only'
from systems s where s.slug = 'dnd5e'
on conflict (id) do nothing;

insert into groups (id, owner_id, name, system_id, format, description, language,
                    timezone, session_weekday, session_slot, frequency, vtt)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111',
       'Mesa de prueba — Sábados de Cthulhu', s.id, 'oneshot',
       'Mesa generada por el seed. Sesión los sábados por la tarde (hora de Madrid): solo la verás si tu disponibilidad solapa.',
       'es', 'Europe/Madrid', 5, 1, 'Quincenal', 'foundry'
from systems s where s.slug = 'cthulhu'
on conflict (id) do nothing;

insert into group_members (group_id, user_id, member_role)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'gm'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'gm')
on conflict (group_id, user_id) do nothing;

insert into group_openings (id, group_id, seats, requirements)
values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2, 'Buen rollo y ganas de rolear'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, null)
on conflict (id) do nothing;

-- 6. Swipes preparados para que TU cuenta real pueda provocar matches
--    (tu cuenta = el único perfil con discord_id; los falsos no tienen)

-- 6a. La "Mesa de prueba — Los Colmillos de Ankh" ya te ha dado like:
--     en cuanto le des a "Me interesa" en el feed → match instantáneo.
insert into swipes (user_id, group_id, origin, direction)
select p.id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'group', 'like'
from profiles p
where p.discord_id is not null
on conflict (user_id, group_id, origin) do nothing;

-- 6b. Los jugadores falsos dan like a TODAS tus mesas: aparecerán en
--     "Ver candidatos" y al darles like tendrás match instantáneo.
--     (Si creas una mesa nueva, re-ejecuta este script.)
insert into swipes (user_id, group_id, origin, direction)
select fake.id, g.id, 'user', 'like'
from (values ('22222222-2222-4222-8222-222222222222'::uuid),
             ('33333333-3333-4333-8333-333333333333'::uuid)) as fake(id),
     groups g
where g.owner_id in (select id from profiles where discord_id is not null)
on conflict (user_id, group_id, origin) do nothing;
