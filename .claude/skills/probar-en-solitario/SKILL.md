---
name: probar-en-solitario
description: Cómo probar RolMatch con una sola cuenta real — mundo de prueba, matches instantáneos y reset completo. Usar cuando haya que probar feed, matches, candidatos o el bot sin segunda cuenta.
---

# Probar en solitario

## Reset completo (el orden importa)
1. `scripts\reset-discord-dev.ps1 -Token <DISCORD_BOT_TOKEN>` — purga los
   canales match-*/mesa-*/voz-* del servidor comunitario (lo ejecuta el
   usuario en SU PowerShell; el token nunca pasa por el chat).
2. `supabase/seed/dev-reset.sql` en el SQL Editor — borra y recrea el mundo
   de prueba Y desvincula los canales borrados de mesas/matches.

## Qué crea el seed (idempotente, ids deterministas)
- 6 GMs falsos con 8 mesas variadas: 5 sin horario (siempre visibles en el
  feed) y 3 con sesión fija (sirven para ver el filtro horario); zonas
  horarias Madrid/Canarias/Buenos Aires/CDMX; estilos opuestos.
- 8 jugadores falsos con disponibilidades distintas; los 4 primeros con
  personajes públicos en vitrina (para el ciclo por tap y los likes).
- Likes pre-armados: las mesas 1 y 3 ya dieron like al usuario real
  (match instantáneo al swipear); los jugadores 1-5 dieron like a TODAS las
  mesas del usuario real (1-4 proponiendo personaje) → aparecen primero en
  candidatos con badge 💘.
- El usuario real se detecta por `discord_id is not null` (los falsos no tienen).
- Emails falsos: `@test.rolmatch.local` (la limpieza filtra por ese dominio).

## Cuándo re-ejecutar
- Los swipes se consumen: si el feed se queda vacío o quieres repetir un
  match, reset completo.
- Si el usuario crea una mesa nueva y quiere candidatos con like previo,
  re-ejecutar solo el seed (los falsos likean todas sus mesas).

## Verificaciones útiles
- `select * from matches` / `swipes` / `blocks` en el SQL Editor.
- Estado del backend sin dashboard: REST con la anon key
  (`.../rest/v1/<tabla>?select=...&limit=1`, header `apikey`).
- SOLO entornos dev: jamás ejecutar seeds contra un proyecto con usuarios reales.
