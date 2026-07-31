import * as ImagePicker from 'expo-image-picker';

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

/**
 * Abre el selector de imágenes, sube la elegida al bucket público `avatars`
 * (carpeta del usuario, requerida por las políticas de Storage) y devuelve
 * la URL pública. Devuelve null si el usuario cancela.
 */
export async function pickAndUploadImage(
  userId: string,
  prefix: 'avatar' | 'group' | 'character' | 'journal' | 'chat',
  aspect: [number, number] = [1, 1],
  options: { allowsEditing?: boolean } = {}
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
  const path = `${userId}/${prefix}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, data, { contentType, upsert: true });
  if (error) throw error;

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
