// Caché en memoria por pantalla — stale-while-revalidate casero. Las
// pantallas calientes (chats, mesa, perfiles) arrancan con lo último que
// vieron en vez de con la rueda de carga, y refrescan en silencio. Vive
// solo en memoria: un reload/reinicio empieza limpio, y la RLS no se toca
// (aquí solo entra lo que el propio usuario ya vio en esta sesión).

const MAX_ENTRIES = 80;

const cache = new Map<string, unknown>();

export function cacheGet<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function cacheSet(key: string, value: unknown) {
  // reinsertar mantiene el Map ordenado por uso: el primero es el más viejo
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}
