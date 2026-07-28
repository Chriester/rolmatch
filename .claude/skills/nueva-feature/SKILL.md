---
name: nueva-feature
description: Flujo completo para construir y entregar una feature en RolMatch — rama, verificación, commit, PR, merge y tablero. Usar SIEMPRE al empezar o cerrar cualquier trabajo de código.
---

# Flujo de feature en RolMatch

## Empezar
1. `git checkout main && git pull` y rama nueva: `feature/nombre-corto` (o `fix/`, `chore/`).
2. Si la feature cubre un issue del tablero, muévelo a "In Progress"
   (proyecto 2 de Chriester; field Status `PVTSSF_lAHOCLpDLs4BeTuvzhYu8fs`,
   In Progress `47fc9ee4`, Done `98236657`, project `PVT_kwHOCLpDLs4BeTuv`).

## Antes de commitear (siempre los tres)
```
npm run typecheck 2>&1 | tail -4; npm run lint 2>&1 | tail -4; npm test 2>&1 | tail -3
```
(encadenados con `;` y tail — con `&&`+pipe el exit code se lo come el tail)
- Rutas nuevas de Expo Router: las rutas tipadas se regeneran con el dev
  server corriendo. Si `tsc` da errores raros de rutas (`/index` en vez de
  `/`, paths `/../lib/...`): el server es VIEJO → matar el proceso del puerto
  8081, `rm -rf .expo/types`, `npx expo start --clear`.
- Cambio visual → skill **qa-visual** (capturas antes de mergear).
- Pantalla nueva → registrarla en el Stack de `src/app/_layout.tsx`.

## Migraciones y orden de merge
- Si el código NUEVO hace select de columnas/tablas nuevas: o el fetch degrada
  con gracia (catch → valor vacío, patrón fetchMyChats/chat_reads), o la
  migración se aplica ANTES de mergear (pedírselo a Chris y verificar por REST
  con curl+apikey). Ya rompimos el feed una vez por esto (00020).

## Commit y PR
- Conventional Commits en español sin tildes ni comillas dobles en el mensaje
  (PowerShell rompe los here-strings con `"` embebidas).
- Cuerpo del PR: qué hace + cómo probarlo + `Closes #N` — **en inglés**;
  "Cierra #N" NO cierra issues.
- `gh.exe` está en `C:\Program Files\GitHub CLI\gh.exe` (no en PATH).

## Merge
- `gh pr merge N --squash --admin --delete-branch` — el `--delete-branch` es
  obligatorio: sin él, las PRs apiladas se mergean contra la rama base viva y
  el código nunca llega a main (nos pasó con la PR #26).
- Evita PRs apiladas si puedes; si las hay, mergea la de abajo primero.
- Los squash merges rompen la historia compartida: si una rama posterior
  conflicta con cambios que ya contiene, `git merge -X ours origin/main`.
- Tras el merge: `git checkout main && git pull` y borra la rama local.
- Si hay migración o cambio de Edge Function, RECUERDA al usuario aplicarla
  (skills migracion-db / bot-discord).

## Preferencias del proyecto
- Estructura primero, pulido por focos después. Referencia visual: Tinder.
- Coste 0: free tiers; nada de servicios de pago sin preguntar.
- UI en español, código e identificadores en inglés.
