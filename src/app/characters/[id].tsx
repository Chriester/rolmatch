import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { CharacterForm } from '@/components/character-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  deleteCharacter,
  fetchCharacter,
  updateCharacter,
  type Character,
  type CharacterInput,
} from '@/lib/characters';

export default function EditCharacterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [character, setCharacter] = useState<Character | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCharacter(id)
      .then(setCharacter)
      .catch(() => setCharacter(null));
  }, [id]);

  const handleSave = async (input: CharacterInput) => {
    if (!id) return;
    setBusy(true);
    try {
      await updateCharacter(id, input);
      router.replace('/characters');
    } catch (error) {
      showAlert('No se pudo guardar', error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    // confirm() solo existe en web; en nativo bastará el flujo de borrado normal
    if (Platform.OS === 'web' && !window.confirm('¿Borrar este personaje? No se puede deshacer.')) {
      return;
    }
    setBusy(true);
    try {
      await deleteCharacter(id);
      router.replace('/characters');
    } catch (error) {
      showAlert('No se pudo borrar', error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/characters'))}>
            <ThemedText type="link">← Volver</ThemedText>
          </Pressable>
          <Pressable onPress={handleDelete} disabled={busy}>
            <ThemedText type="small" style={styles.deleteLabel}>
              Borrar
            </ThemedText>
          </Pressable>
        </View>

        {character === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : character === null ? (
          <ThemedText style={styles.empty}>No se pudo cargar el personaje.</ThemedText>
        ) : (
          <>
            <ThemedText type="title">{character.name}</ThemedText>
            <CharacterForm
              initial={character}
              busy={busy}
              submitLabel="Guardar cambios"
              onSubmit={handleSave}
            />
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteLabel: {
    color: '#d9534f',
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
