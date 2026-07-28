---
name: qa-visual
description: Verificar pantallas con capturas headless (Chrome + puppeteer) contra localhost o producción, con sesión QA inyectada. Usar antes de mergear cualquier cambio visual.
---

# QA visual con capturas

## El rig
`shot.js` vive en el scratchpad de la sesión (`<scratchpad>/qa/shot.js`, con su
`node_modules` de puppeteer-core). Si no existe (scratchpad nuevo), recrearlo:
Chrome headless de `C:/Program Files/Google/Chrome/Application/chrome.exe`,
viewport 420×820 @2x, y estos aprendizajes YA incorporados:

- Rutas SIN barra inicial (`node shot.js chats foo.png`) — Git Bash mangla `/chats`.
- `waitUntil: 'domcontentloaded'` + espera fija ~7 s. NUNCA `networkidle2`:
  los websockets de Realtime lo bloquean para siempre.
- Timeout 90 s en el goto de /login (Metro rebundlea en frío y tarda).
- `--session` inyecta `session.json` en localStorage
  `sb-pyysoeztdtxwbtpxwdnl-auth-token` **y también** el flag
  `rolder-tutorial-visto=1` (si no, el tutorial tapa el feed).
- `SHOT_BASE=https://rolmatch.vercel.app` para capturar PRODUCCIÓN
  (misma sesión: mismo proyecto de Supabase).

## Cuenta QA
"Vaelen QA" — `chrishernandezponce+rolderqa@gmail.com` / `rolder-qa-2026-swipe`
(id `ed350f50-9576-4817-b00d-b753455fd253`). El token caduca: renovar
`session.json` antes de cada tanda:

```bash
curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email":"chrishernandezponce+rolderqa@gmail.com","password":"rolder-qa-2026-swipe"}' > session.json
```
($URL y $ANON salen de `.env`: EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY.)

## Flujo
1. Dev server vivo en 8081 (si hay uno viejo de otro día: matarlo, `rm -rf
   .expo/types`, `npx expo start --clear` — el viejo corrompe rutas tipadas).
2. Renovar sesión → capturar las pantallas tocadas → **mirar los PNG** (Read)
   antes de mergear. La cuenta QA no es miembro de mesas: pantallas de mesa
   salen en modo no-miembro; para probar la DB directa, curl REST con su token.
