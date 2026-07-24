import * as DocumentPicker from 'expo-document-picker';

import { supabase } from '@/lib/supabase';

export type CharacterSheet = {
  id: string;
  storage_path: string;
  mime_type: string;
  is_public: boolean;
  uploaded_at: string;
};

const BUCKET = 'character-sheets';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // límite del PRD (§8.5)

export async function fetchSheet(characterId: string): Promise<CharacterSheet | null> {
  const { data, error } = await supabase
    .from('character_sheets')
    .select('id, storage_path, mime_type, is_public, uploaded_at')
    .eq('character_id', characterId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Abre el selector de archivos (PDF o imagen), sube la hoja al bucket
 * privado `character-sheets` y registra la fila. Reemplaza la anterior
 * si existía. Devuelve null si el usuario cancela.
 */
export async function pickAndUploadSheet(
  userId: string,
  characterId: string
): Promise<CharacterSheet | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (asset.size && asset.size > MAX_SIZE_BYTES) {
    throw new Error('La hoja no puede superar los 5 MB.');
  }

  const contentType = asset.mimeType ?? 'application/pdf';
  const extension = asset.name?.split('.').pop() ?? contentType.split('/')[1] ?? 'pdf';
  const path = `${userId}/${characterId}-${Date.now()}.${extension}`;

  const data = await (await fetch(asset.uri)).arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, data, { contentType });
  if (uploadError) throw uploadError;

  // Reemplaza la hoja anterior (archivo + fila)
  const previous = await fetchSheet(characterId);
  if (previous) {
    await supabase.storage.from(BUCKET).remove([previous.storage_path]);
    await supabase.from('character_sheets').delete().eq('id', previous.id);
  }

  const { data: row, error } = await supabase
    .from('character_sheets')
    .insert({
      character_id: characterId,
      storage_path: path,
      mime_type: contentType,
      is_public: previous?.is_public ?? false,
    })
    .select('id, storage_path, mime_type, is_public, uploaded_at')
    .single();
  if (error) throw error;
  return row;
}

/** Cambia la visibilidad de la hoja (privada por defecto). */
export async function setSheetPublic(sheetId: string, isPublic: boolean) {
  const { error } = await supabase
    .from('character_sheets')
    .update({ is_public: isPublic })
    .eq('id', sheetId);
  if (error) throw error;
}

/** URL firmada temporal para ver/descargar la hoja (el bucket es privado). */
export async function sheetSignedUrl(sheet: CharacterSheet): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(sheet.storage_path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteSheet(sheet: CharacterSheet) {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([sheet.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('character_sheets').delete().eq('id', sheet.id);
  if (error) throw error;
}
