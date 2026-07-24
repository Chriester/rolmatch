import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { showAlert } from '@/lib/alert';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { pickAndUploadImage } from '@/lib/images';

type PhotoPickerProps = {
  userId: string;
  prefix: 'avatar' | 'group' | 'character';
  url: string | null;
  onPicked: (url: string) => void;
  /** 'circle' para avatares/retratos, 'card' para fotos de mesa (16:9) */
  shape?: 'circle' | 'card';
  label?: string;
};

export function PhotoPicker({
  userId,
  prefix,
  url,
  onPicked,
  shape = 'circle',
  label = 'Añadir foto',
}: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);

  const handlePick = async () => {
    setBusy(true);
    try {
      const uploaded = await pickAndUploadImage(
        userId,
        prefix,
        shape === 'card' ? [16, 9] : [1, 1]
      );
      if (uploaded) onPicked(uploaded);
    } catch (error) {
      showAlert('No se pudo subir la imagen', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const shapeStyle = shape === 'circle' ? styles.circle : styles.card;

  return (
    <Pressable
      style={[styles.base, shapeStyle, !url && styles.placeholder]}
      onPress={handlePick}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {busy ? (
        <ActivityIndicator />
      ) : url ? (
        <Image source={{ uri: url }} style={[styles.image, shapeStyle]} />
      ) : (
        <ThemedText type="small" style={styles.placeholderLabel}>
          📷 {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  card: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.two,
  },
  placeholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#666',
  },
  placeholderLabel: {
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
