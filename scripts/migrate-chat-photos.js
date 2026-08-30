#!/usr/bin/env node

/**
 * Migra las fotos de chat viejas del bucket público `avatars` al bucket
 * privado `chat-media` (migr. 00044). Antes de esa migración, TODAS las
 * fotos —incluidas las de un DM 1-a-1— se subían con
 * `pickAndUploadImage(userId, 'chat', ...)` al bucket público `avatars`,
 * en `<userId>/chat-<timestamp>.<ext>`, con URL abierta para siempre.
 *
 * Este script:
 *   1. Busca en `messages` y `dm_messages` los mensajes kind='image' cuyo
 *      media_url siga siendo una URL pública de `avatars` (los nuevos ya
 *      guardan solo una ruta, no una URL — ver lib/images.ts).
 *   2. Copia el objeto a `chat-media`, en la ruta con ámbito que exige la
 *      RLS de esa migración: group/<group_id>/<sender_id>/<file> o
 *      dm/<thread_id>/<sender_id>/<file>.
 *   3. Actualiza esa fila para que media_url pase a ser la ruta nueva (el
 *      cliente ya distingue URL completa = vieja/pública de ruta = nueva/
 *      firmada, así que no hace falta tocar nada más).
 *   4. Borra el objeto viejo de `avatars` — sin esto la foto sigue siendo
 *      pública por su URL antigua aunque la app ya no la use.
 *
 * Solo toca fotos de CHAT: avatares de perfil, portadas de mesa, retratos
 * de personaje y fotos del diario se quedan donde están (siguen pensadas
 * para ser públicas — ver el comentario de pickAndUploadImage).
 *
 * Idempotente: una fila ya migrada tiene media_url = ruta (no empieza por
 * "http"), así que la consulta no la vuelve a coger en una segunda pasada.
 * Los fallos de una fila no paran el resto — se listan al final para
 * repasarlos a mano.
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SB_SECRET_KEY=sb_secret_... \
 *     node scripts/migrate-chat-photos.js           # dry-run, no toca nada
 *   SUPABASE_URL=... SB_SECRET_KEY=... \
 *     node scripts/migrate-chat-photos.js --execute  # migra de verdad
 *
 * SB_SECRET_KEY es la clave de servicio (Project Settings → API → secret
 * keys en el dashboard) — hace falta para saltar la RLS y tocar mensajes y
 * ficheros de cualquier usuario. NUNCA la metas en el repo ni en un commit.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SB_SECRET_KEY;
const DRY_RUN = !process.argv.includes('--execute');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Faltan variables de entorno: SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL) y SB_SECRET_KEY.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const OLD_BUCKET = 'avatars';
const NEW_BUCKET = 'chat-media';
// La URL pública tiene la forma .../storage/v1/object/public/avatars/<path>
const PUBLIC_PREFIX = `/storage/v1/object/public/${OLD_BUCKET}/`;

/** Extrae la ruta dentro del bucket a partir de la URL pública guardada. */
function pathFromPublicUrl(url) {
  const idx = url.indexOf(PUBLIC_PREFIX);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + PUBLIC_PREFIX.length));
}

async function fetchCandidates(table, scopeColumn) {
  const { data, error } = await supabase
    .from(table)
    .select(`id, sender_id, media_url, ${scopeColumn}`)
    .eq('kind', 'image')
    .like('media_url', 'http%avatars%');
  if (error) throw error;
  return data ?? [];
}

async function migrateRow(table, scopeColumn, row) {
  const oldPath = pathFromPublicUrl(row.media_url);
  if (!oldPath) {
    return { ok: false, reason: `media_url no reconocida: ${row.media_url}` };
  }
  const filename = oldPath.split('/').pop();
  const scopeId = row[scopeColumn];
  const scopeFolder = table === 'messages' ? 'group' : 'dm';
  const newPath = `${scopeFolder}/${scopeId}/${row.sender_id}/${filename}`;

  if (DRY_RUN) {
    console.log(`[dry-run] ${table} ${row.id}: avatars/${oldPath} -> chat-media/${newPath}`);
    return { ok: true };
  }

  const { error: copyError } = await supabase.storage
    .from(OLD_BUCKET)
    .copy(oldPath, newPath, { destinationBucket: NEW_BUCKET });
  if (copyError) {
    return { ok: false, reason: `copy: ${copyError.message}` };
  }

  const { error: updateError } = await supabase
    .from(table)
    .update({ media_url: newPath })
    .eq('id', row.id);
  if (updateError) {
    return { ok: false, reason: `update fila (foto ya copiada a ${newPath}, revisar a mano): ${updateError.message}` };
  }

  const { error: removeError } = await supabase.storage.from(OLD_BUCKET).remove([oldPath]);
  if (removeError) {
    // la fila ya apunta a la copia nueva: esto es solo limpieza, no bloquea nada
    return { ok: true, warning: `no se pudo borrar la vieja avatars/${oldPath}: ${removeError.message}` };
  }

  console.log(`✓ ${table} ${row.id}: avatars/${oldPath} -> chat-media/${newPath}`);
  return { ok: true };
}

async function migrateTable(table, scopeColumn) {
  const rows = await fetchCandidates(table, scopeColumn);
  console.log(`${table}: ${rows.length} fotos por migrar`);
  const failures = [];
  for (const row of rows) {
    const result = await migrateRow(table, scopeColumn, row);
    if (!result.ok) failures.push({ table, id: row.id, reason: result.reason });
    else if (result.warning) console.warn(`⚠ ${table} ${row.id}: ${result.warning}`);
  }
  return failures;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (nada se toca) ===' : '=== EJECUTANDO DE VERDAD ===');
  const failures = [
    ...(await migrateTable('messages', 'group_id')),
    ...(await migrateTable('dm_messages', 'thread_id')),
  ];
  if (failures.length > 0) {
    console.log(`\n${failures.length} filas fallaron, revisar a mano:`);
    for (const f of failures) console.log(`  - ${f.table} ${f.id}: ${f.reason}`);
    process.exitCode = 1;
  } else {
    console.log('\nSin fallos.');
  }
  if (DRY_RUN) {
    console.log('\nEsto era un dry-run. Repite con --execute para migrar de verdad.');
  }
}

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
