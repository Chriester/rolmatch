import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

/**
 * Abre el selector de imágenes, sube la elegida al bucket público `avatars`
 * (carpeta del usuario, requerida por las políticas de Storage) y devuelve
 * la URL pública. Devuelve null si el usuario cancela.
 */
export async function pickAndUploadImage(
  userId: string,
  prefix: 'avatar' | 'group' | 'character' | 'journal',
  aspect: [number, number] = [1, 1]
): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const data = await (await fetch(asset.uri)).arrayBuffer();
  const contentType = asset.mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] ?? 'jpg';
  const path = `${userId}/${prefix}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, data, { contentType, upsert: true });
  if (error) throw error;

  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
