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
2. Aplica el esquema: `supabase db push` (CLI) o pega [supabase/migrations/00001_initial_schema.sql](supabase/migrations/00001_initial_schema.sql) en el SQL Editor.
3. Activa el provider **Discord** en Authentication → Providers con las credenciales de tu [aplicación de Discord](https://discord.com/developers/applications), y añade la redirect URL de Supabase en Discord.

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
