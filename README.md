# RolMatch 🎲

**App de matchmaking para grupos de rol de mesa online en español.**

Conecta jugadores, GMs y grupos existentes mediante un sistema de matching tipo swipe centrado en **grupos** (no solo 1-a-1), con integración profunda con Discord y perfiles duales: la persona y sus personajes.

> El matching tiene en cuenta lo que otros ignoran: **zona horaria real** (convertida a UTC), idioma, sistemas en común y estilo de juego.

## ✨ Funcionalidades (MVP en desarrollo)

- 🔑 Login con Discord OAuth (+ email como fallback)
- 👤 Perfil de persona: disponibilidad semanal, zona horaria, sistemas, estilo de juego
- 🧙 Vitrina de personajes con hoja adjunta (PDF/imagen)
- 🎯 Feed de swipe: jugadores ven grupos; grupos ven candidatos → match bidireccional
- 🤖 Bot de Discord: canal automático al hacer match, recordatorios de sesión

Roadmap completo por fases en el [PRD](docs/PRD-rolmatch.md).

## 🛠️ Stack

| Capa | Tecnología |
|---|---|
| App | React Native + Expo SDK 57 (iOS · Android · web), Expo Router, TypeScript |
| Backend | Supabase (Postgres + RLS, Auth con Discord, Realtime, Storage, Edge Functions) |
| Bot | Node.js + discord.js |
| CI | GitHub Actions (lint + typecheck en cada PR) |

## 🚀 Setup local

```bash
git clone <url-del-repo>
cd rolmatch
npm install
cp .env.example .env   # rellena las claves de Supabase
npm start              # Expo Dev Server (i = iOS, a = Android, w = web)
```

### Backend (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com) (free tier).
2. Aplica el esquema: `supabase db push` (CLI) o pega **en orden** los archivos de [supabase/migrations/](supabase/migrations/) en el SQL Editor (`00001_initial_schema.sql`, `00002_blocks.sql`, …).
3. Activa el provider **Discord** en Authentication → Providers con las credenciales de tu [aplicación de Discord](https://discord.com/developers/applications), y añade la redirect URL de Supabase en Discord.

### Bot de Discord (canal automático al hacer match)

El "bot" del MVP no es un proceso persistente: es la Edge Function [supabase/functions/discord-match](supabase/functions/discord-match/index.ts), disparada por un Database Webhook cuando se inserta un `match`. **Modelo de canales: uno de texto + uno de voz POR MESA** — el primer match de una mesa crea sus canales privados (`#mesa-…` y `voz-…`) y los siguientes matches añaden al jugador a los canales existentes (requiere la migración `00006`). Setup (una vez):

1. **Bot**: en tu [aplicación de Discord](https://discord.com/developers/applications) → **Bot** → "Add Bot" (si no existe) → copia el **Token** (Reset Token).
2. **Servidor comunitario**: crea un servidor de Discord para la app (o usa uno existente) y copia su **ID** (clic derecho sobre el servidor → "Copiar ID del servidor", con el modo desarrollador activado en Ajustes → Avanzado).
3. **Invitar al bot** al servidor con permisos de gestionar canales: abre
   `https://discord.com/oauth2/authorize?client_id=TU_CLIENT_ID&scope=bot&permissions=268435472`
   (Manage Channels + Manage Roles, necesarios para crear canales privados con permisos).
4. **Secrets** en Supabase → Edge Functions → Secrets: `DISCORD_BOT_TOKEN` (⚠️ de la **misma aplicación** cuyo bot invitaste al servidor), `DISCORD_GUILD_ID`, un `WEBHOOK_SECRET` inventado (largo y aleatorio) y `SB_SECRET_KEY` con la clave `sb_secret_...` de Project Settings → API Keys (la clave service_role legada es un JWT y puede fallar con `PGRST303` por desfase de reloj en proyectos recién creados).
5. **Desplegar la función**: `npx supabase functions deploy discord-match --no-verify-jwt` (requiere `npx supabase login` y `npx supabase link --project-ref TU_REF` la primera vez).
6. **Webhook**: Supabase → Database → Webhooks → Create: tabla `matches`, evento INSERT, tipo "Supabase Edge Function" → `discord-match`, y añade la cabecera HTTP `x-webhook-secret` con tu `WEBHOOK_SECRET`.
7. En `.env` de la app, pon `EXPO_PUBLIC_DISCORD_GUILD_ID` con el ID del servidor para que "Mis matches" enlace a los canales.

> Nota: los canales solo pueden dar acceso a usuarios que **ya son miembros del servidor comunitario**. Pon el enlace de invitación del servidor en la bienvenida de la app o en el mensaje del canal.

### Notificaciones push (§8.6)

- **Web**: sin push — el aviso de match es la mención del bot en el canal de Discord.
- **iOS/Android**: Expo Push. La app registra el token del dispositivo en `push_tokens` (migración `00003_push_tokens.sql`) y la Edge Function `discord-match` envía la notificación al hacer match. Requiere un **development build con proyecto EAS** (`eas init` + `eas build --profile development`); en Expo Go el push remoto no está disponible y la app simplemente lo omite.

### Datos de prueba (probar en solitario)

Para probar el feed y los matches sin necesitar una segunda cuenta, pega [supabase/seed/dev-seed.sql](supabase/seed/dev-seed.sql) en el SQL Editor: crea un GM y dos jugadores falsos, dos mesas de prueba y los likes preparados para provocar matches instantáneos con tu cuenta. Es idempotente (re-ejecútalo si creas mesas nuevas). Se limpia con [supabase/seed/dev-cleanup.sql](supabase/seed/dev-cleanup.sql). **Solo para entornos de desarrollo.**

## 📁 Estructura

```
src/
  app/          # pantallas (Expo Router) — login.tsx, index.tsx…
  lib/          # supabase.ts (cliente), auth.ts (OAuth Discord + magic link)
  hooks/        # use-session.ts…
  components/   # UI compartida
supabase/
  migrations/   # esquema SQL con RLS
docs/
  PRD-rolmatch.md
```

## 🤝 Contribuir

- Ramas `feature/nombre-corto`; PR con revisión antes de mergear a `main` (protegida); squash merge.
- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`…
- Convenciones para trabajar con Claude Code en [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md).

## 📄 Licencia

Ver [LICENSE](LICENSE).
