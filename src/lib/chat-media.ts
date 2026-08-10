// Fotos de chat: las nuevas viven en un bucket privado (migr. 00044) y se
// sirven firmadas. Las de antes de esa migración son URLs públicas completas
// y siguen funcionando tal cual, así que el criterio es la forma del valor
// guardado en media_url: si empieza por http es de las viejas.

import { supabase } from '@/lib/supabase';

export const CHAT_MEDIA_BUCKET = 'chat-media';

/** Una hora: de sobra para mirar un chat sin firmar en cada scroll. */
const SIGNED_TTL_SECONDS = 60 * 60;
/** Margen para no servir una URL que caduca mientras carga la imagen. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const cache = new Map<string, { url: string; expiresAt: number }>();

export function isPublicMedia(mediaUrl: string): boolean {
  return mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://');
}

/**
 * URL con la que pintar una foto de chat. Devuelve la misma si ya es pública
 * (fotos anteriores a la 00044) y una firmada si es una ruta del bucket
 * privado. null si no se puede firmar: la RLS solo deja a quien está en esa
 * conversación.
 */
export async function chatMediaUrl(mediaUrl: string): Promise<string | null> {
  if (isPublicMedia(mediaUrl)) return mediaUrl;

  const cached = cache.get(mediaUrl);
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(mediaUrl, SIGNED_TTL_SECONDS);
  if (error || !data) return null;

  cache.set(mediaUrl, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_TTL_SECONDS * 1000,
  });
  return data.signedUrl;
}
