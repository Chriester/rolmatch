---
name: migracion-db
description: Cómo hacer cambios de esquema en Supabase para RolMatch — numeración, RLS, aplicación manual y gotchas de PostgREST. Usar al crear o modificar tablas, columnas, políticas o buckets.
---

# Migraciones de base de datos

## Reglas
1. Archivo nuevo `supabase/migrations/000NN_nombre.sql` (siguiente número).
   NUNCA editar una migración ya aplicada.
2. **RLS desde el día 1**: toda tabla nueva lleva `enable row level security`
   y sus políticas en la misma migración. Sin política de select ⇒ nadie lee.
3. Las políticas de Storage van también en migraciones (`storage.objects`).
   Bucket `avatars` = público (imágenes de perfil/mesa/personaje, carpeta por
   usuario); `character-sheets` = privado (URLs firmadas).
4. No hay CLI vinculada: **el usuario aplica la migración pegándola en el SQL
   Editor del dashboard**. Al terminar la feature, decírselo SIEMPRE de forma
   explícita ("aplica la migración 000NN antes de probar").

## Gotchas aprendidos (reales)
- **Embeds ambiguos de PostgREST**: si una tabla puente conecta dos tablas ya
  relacionadas (p. ej. `character_likes` entre profiles y characters), los
  embeds `characters(...)` devuelven error 300. Solución: hint explícito
  `characters!characters_user_id_fkey(...)`.
- La clave service_role legada es un JWT y da `PGRST303 JWT issued at future`
  por desfase de reloj en proyectos nuevos → en Edge Functions usar el secret
  `SB_SECRET_KEY` (clave `sb_secret_...`).
- Enum nuevos: crearlos antes de usarlos; castear en seeds (`'x'::mi_enum`).
- Verificable sin dashboard: `curl` a `https://<ref>.supabase.co/rest/v1/<tabla>?select=<col>&limit=1`
  con header `apikey: <anon>` — 200 = la columna existe, 400 = falta migración.

## Orden migración ↔ merge
Migración aditiva = aplicarla ANTES de mergear código que la selecciona
(o el fetch degrada con catch → vacío). Verificar aplicación sin dashboard:
`curl "$URL/rest/v1/<tabla>?select=<col>&limit=1" -H "apikey: $ANON"` → 200.

## Helpers y triggers que YA existen (no duplicar)
- `is_group_member(group_id)` security definer (00021) — para políticas de mesa.
- `grant_xp(...)` + triggers de XP (00016/00017): matches, group_members,
  ratings, group_journal_entries, session_confirmations ya dan XP — al crear
  tablas de actividad nueva, plantearse si deben dar XP vía grant_xp.
- `handle_reciprocal_swipe` crea match + membresía; webhooks INSERT en
  matches/messages disparan discord-match y push-notify.
- Seed: los bots deben quedar "maduros" (avatar + created_at -30d) o no
  generan XP (regla de contrapartida de 00017).

## Datos de prueba
`supabase/seed/dev-reset.sql` = reset total del mundo de prueba (idempotente,
ids deterministas). Si la migración afecta a tablas seedeadas, actualiza el
seed en la misma PR.
