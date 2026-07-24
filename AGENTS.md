# RolMatch — guía para agentes

App de matchmaking para grupos de rol de mesa online en español. Matching tipo swipe centrado en **grupos** (no solo 1-a-1), integración profunda con Discord y perfiles duales (persona + personajes). PRD completo en [docs/PRD-rolmatch.md](docs/PRD-rolmatch.md) — es la fuente de verdad de producto.

## Expo HA CAMBIADO

Lee la documentación versionada exacta en https://docs.expo.dev/versions/v57.0.0/ antes de escribir código de Expo.

## Stack

- **Frontend:** React Native + Expo SDK 57 (iOS/Android/web), Expo Router (rutas en `src/app/`), TypeScript estricto.
- **Backend:** Supabase — Postgres, Auth (Discord OAuth + email), Realtime, Storage, Edge Functions. RLS en todas las tablas.
- **Bot de Discord:** Node.js + discord.js (fase de match; aún no implementado).

## Estructura

- `src/app/` — pantallas (Expo Router). `login.tsx` es el punto de entrada de auth.
- `src/lib/supabase.ts` — cliente único de Supabase. `src/lib/auth.ts` — flujo OAuth Discord (PKCE) + magic link.
- `src/hooks/use-session.ts` — sesión reactiva.
- `supabase/migrations/` — esquema SQL. Nunca editar migraciones aplicadas; crear una nueva.
- `docs/PRD-rolmatch.md` — PRD.

## Esquema de datos (resumen)

`profiles` (1:1 con auth.users, con timezone IANA, sliders de estilo 0-100, discord_id), `availability_slots` (día 0-6 × franja 0-3 en hora local del usuario; el matching convierte a UTC), `systems` + `user_systems` (experiencia por sistema), `characters` + `character_sheets` (adjunto en Storage; `parsed_data JSONB` reservado para extracción IA en fase 4), `groups` + `group_members` + `group_openings`, `swipes` (usuario↔grupo con `origin`; un trigger crea el `match` cuando hay like recíproco), `matches`, `reports`, `ratings`.

## Matching v1 (§7 del PRD) — lo más delicado, pedir tests siempre

Filtros duros: solape horario **convertido a UTC** (mínimo `MIN_OVERLAP_HOURS`), idioma, sistema en común. Score 0-100: solape 35 %, estilo 25 %, sistema/experiencia 20 %, preferencias técnicas 10 %, fiabilidad 10 %.

Implementado en `src/lib/matching.ts`: módulo **puro y sin dependencias** (celdas de 15 min sobre la semana UTC, offsets vía Intl), cubierto por `src/lib/__tests__/matching.test.ts`. En el MVP el feed (`src/lib/feed.ts`) lo ejecuta en cliente sobre listas pequeñas; cuando el volumen lo pida se porta tal cual a una Edge Function. Cualquier cambio en el matching exige actualizar los tests (zonas sin DST y fecha fija para determinismo).

## Convenciones

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Trabajo en ramas `feature/nombre-corto`; PR con revisión antes de mergear a `main`; squash merge.
- Secretos solo en `.env` (ignorado); las variables públicas de Expo llevan prefijo `EXPO_PUBLIC_`.
- Comandos: `npm start` (dev), `npm run lint`, `npm run typecheck`, `npm test`.
- UI en español; código e identificadores en inglés.
