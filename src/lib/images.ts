import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

const MAX_WIDTH = 1024;

/**
 * Redimensiona a máx. 1024px y recomprime a JPEG 80% antes de subir:
 * ahorra ~80% de storage/ancho de banda del free tier. Import dinámico +
 * try/catch: si el módulo nativo no está (binario viejo), se sube tal cual.
 */
async function compressImage(asset: ImagePicker.ImagePickerAsset): Promise<{
  uri: string;
} | null> {
  if (asset.width > 0 && asset.width <= MAX_WIDTH) return null;
  try {
    const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
    const context = ImageManipulator.manipulate(asset.uri);
    context.resize({ width: MAX_WIDTH });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
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
