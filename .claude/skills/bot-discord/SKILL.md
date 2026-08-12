---
name: bot-discord
description: Integración con Discord de RolMatch — Edge Functions, webhooks, canales por mesa, secrets y depuración. Usar al tocar supabase/functions/*, el flujo de match o cualquier cosa de Discord.
---

# Bot de Discord (Edge Functions)

> **⛔ INTEGRACIÓN DESACTIVADA POR COMPLETO hasta nuevo aviso** (decisión de
> Chris, 2026-08-12: no se va a usar de la forma planeada en un futuro
> cercano). `DISCORD_ENABLED = false` en `src/lib/config.ts`, webhooks y
> cron pausados en el dashboard. El login OAuth con Discord SÍ sigue activo
> (es solo un proveedor de identidad). No construir nada sobre esta
> integración sin que Chris la reactive explícitamente.

## Arquitectura
- Sin proceso persistente: Edge Functions + API REST de Discord con token de bot.
- `discord-match`: Database Webhook en INSERT de `matches`. Modelo de canales:
  **1 canal de texto (#mesa-…) + 1 de voz (voz-…) POR MESA**; el primer match
  los crea (ids en `groups.discord_channel_id` / `discord_voice_channel_id`),
  los siguientes AÑADEN al jugador vía PUT permissions. Desplegar con
  **Verify JWT DESACTIVADO**; auth = cabecera `x-webhook-secret`.
- `discord-join`: la app la invoca tras login (el OAuth pide scope
  `guilds.join`) y el bot une al usuario al servidor comunitario.
  **Verify JWT DESACTIVADO** (desde 2026-08-12, PR #181): la pasarela solo
  valida JWT legacy HS256 y el proyecto firma ES256 — con él activado
  rechazaba a todos con UNAUTHORIZED_ASYMMETRIC_JWT. La sesión se valida
  DENTRO de la función con auth.getUser; no reactivar el toggle.

## Secrets (Edge Functions → Secrets)
`DISCORD_BOT_TOKEN` (de la MISMA app cuyo bot está en el servidor — hubo un
bug por tener dos apps), `DISCORD_GUILD_ID`, `WEBHOOK_SECRET`, `SB_SECRET_KEY`
(clave sb_secret_..., no el service_role legado → PGRST303).

## Deploy y prueba
- Desde el PR #114, **mergear a main despliega las 7 funciones solo** (paso
  de Actions con `supabase functions deploy`; el flag verify_jwt por función
  vive en `supabase/config.toml`). Ya no se pega código en el dashboard.
- Probar la función a mano:
  `curl -X POST <url>/functions/v1/discord-match -H "x-webhook-secret: <s>" -d '{"type":"INSERT","table":"matches","record":{...}}'`
- Re-disparar un match sin la app: `delete from matches ...; insert into matches (user_id, group_id) select ...` en el SQL Editor.
- Depurar: Edge Functions → Logs (la función tiene console.log por paso) y
  la pestaña Invocations (status + body; 200 text/plain = salida silenciosa).

## Errores conocidos de la API de Discord
- `40333 internal network error`: falta User-Agent con formato
  `DiscordBot (url, version)` (y TLS 1.2 desde PowerShell 5.1).
- `403 Missing Permissions (50013)`: el bot no tiene los permisos en el
  servidor O el token es de otra app. Necesita: ver canales, gestionar
  canales, gestionar roles, enviar mensajes, leer historial (+ crear
  invitación para guilds.join). PRE-BETA: rebajar de Administrador a esos.
- Nombres de canal: minúsculas, sin acentos (NFD + strip), solo `[a-z0-9-]`.

## Reset de desarrollo
`scripts/reset-discord-dev.ps1 -Token <bot>` borra match-*/mesa-*/voz-* y
después SIEMPRE ejecutar `supabase/seed/dev-reset.sql` (desvincula los ids
de canal de la DB; si no, el bot publica en canales muertos).
