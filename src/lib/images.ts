import * as ImagePicker from 'expo-image-picker';

import { CHAT_MEDIA_BUCKET } from '@/lib/chat-media';
import { supabase } from '@/lib/supabase';

// 1600px cubre la tarjeta del feed en pantallas 3x (con 1024 se reescalaba
// hacia arriba y se veía borrosa); JPEG 0.85 en UNA sola pasada.
const MAX_WIDTH = 1600;

/**
 * Redimensiona a máx. 1600px y comprime a JPEG 85% antes de subir:
 * equilibrio nitidez/free tier. Import dinámico + try/catch: si el módulo
 * nativo no está (binario viejo), se sube tal cual.
 */
async function compressImage(asset: ImagePicker.ImagePickerAsset): Promise<{
  uri: string;
} | null> {
  try {
    const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
    const context = ImageManipulator.manipulate(asset.uri);
    // única pasada JPEG para todo; redimensiona solo si se pasa del tope
    if (asset.width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    return { uri: saved.uri };
  } catch {
    return null;
  }
}

/** Conversación a la que pertenece una foto de chat (migr. 00044). */
export type ChatMediaTarget = { kind: 'group' | 'dm'; id: string };

/**
 * Abre el selector de imágenes, sube la elegida y devuelve lo que hay que
 * guardar.
 *
 * Por defecto va al bucket público `avatars` (avatares, portadas, retratos,
 * diario) y devuelve su URL pública. Con `chatTarget` va al bucket PRIVADO
 * `chat-media`, en la carpeta de esa conversación, y devuelve la RUTA: las
 * fotos de chat —sobre todo las de un privado— no deben tener URL abierta.
 * Quien las pinta las firma (ver chat-media.ts).
 *
 * Devuelve null si el usuario cancela.
 */
export async function pickAndUploadImage(
  userId: string,
  prefix: 'avatar' | 'group' | 'character' | 'journal' | 'chat',
  aspect: [number, number] = [1, 1],
  options: { allowsEditing?: boolean; chatTarget?: ChatMediaTarget } = {}
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // las fotos de chat van tal cual, sin recorte forzado
    allowsEditing: options.allowsEditing ?? true,
    aspect,
    // sin compresión del picker: comprimir aquí Y en compressImage era una
    // doble pasada JPEG que degradaba visiblemente las tarjetas del feed
    quality: 1,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const optimized = await compressImage(asset);
  const data = await (await fetch(optimized?.uri ?? asset.uri)).arrayBuffer();
  const contentType = optimized ? 'image/jpeg' : (asset.mimeType ?? 'image/jpeg');
  const extension = contentType.split('/')[1] ?? 'jpg';
  const name = `${prefix}-${Date.now()}.${extension}`;

  if (options.chatTarget) {
    const { kind, id } = options.chatTarget;
    // el ámbito va DELANTE: la política de Storage lo lee de la ruta para
    // decidir quién puede mirar la foto
    const path = `${kind}/${id}/${userId}/${name}`;
    const { error } = await supabase.storage
      .from(CHAT_MEDIA_BUCKET)
      .upload(path, data, { contentType, upsert: true });
    if (error) throw error;
    return path;
  }

  const path = `${userId}/${name}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, data, { contentType, upsert: true });
  if (error) throw error;

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
