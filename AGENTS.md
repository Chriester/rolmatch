# RolMatch — guía para agentes

App de matchmaking para grupos de rol de mesa online en español, estilo Tinder
(swipe entre jugadores y mesas) con integración profunda con Discord. El PRD en
[docs/PRD-rolmatch.md](docs/PRD-rolmatch.md) es la fuente de verdad de producto;
la UX del swipe está especificada en [docs/diseno-swipe.md](docs/diseno-swipe.md).

## Expo HA CAMBIADO

Lee la documentación versionada exacta en https://docs.expo.dev/versions/v57.0.0/ antes de escribir código de Expo.

## Stack

- **Frontend:** React Native + Expo SDK 57 (iOS/Android/web), Expo Router (`src/app/`), TypeScript estricto, Reanimated + Gesture Handler para el swipe.
- **Backend:** Supabase — Postgres con RLS en todo, Auth (Discord OAuth + email), Storage, Edge Functions (bot de Discord).
- **Producción web:** https://rolmatch.vercel.app (auto-deploy al mergear a `main`).

## Estructura

- `src/app/` — pantallas; `index.tsx` ES el feed (página principal).
- `src/components/swipe/` — deck, tarjetas, física del swipe.
- `src/lib/` — lógica: `matching.ts` (algoritmo, testeado), `feed.ts`, `supabase.ts`, `auth.ts`…
- `supabase/migrations/` — esquema SQL (nunca editar aplicadas); `supabase/functions/` — bot; `supabase/seed/` — mundo de prueba.

## Skills del proyecto (cargar la que toque antes de trabajar)

- **nueva-feature** — flujo completo rama→PR→merge→tablero y convenciones. Usar SIEMPRE.
- **migracion-db** — cambios de esquema, RLS, orden migración↔merge y helpers existentes.
- **qa-visual** — capturas headless (rig, cuenta QA, gotchas) antes de mergear UI.
- **ui-rolder** — inventario del design system: tokens, primitivas y componentes.
- **apk-y-ota** — OTA vs build nativo, runtime versions, EAS y FCM.
- **bot-discord** — Edge Functions, webhooks, canales por mesa, depuración.
- **swipe-feel** — física y arquitectura del feed Tinder.
- **matching** — reglas para tocar el algoritmo (exige tests).
- **probar-en-solitario** — seeds y reset para probar con una cuenta.

## Reglas transversales

- Comandos: `npm start` · `npm run typecheck` · `npm run lint` · `npm test` (los tres últimos antes de cada commit).
- UI en español; código e identificadores en inglés. Conventional Commits.
- `Alert.alert` es no-op en web: usar `showAlert` de `src/lib/alert.ts`.
- Coste 0: free tiers; nada de servicios de pago sin consultar al usuario.
