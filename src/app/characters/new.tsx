import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { CharacterForm } from '@/components/character-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { createCharacter, type CharacterInput } from '@/lib/characters';

export default function NewCharacterScreen() {
  const session = useSession();
  const [busy, setBusy] = useState(false);

  const handleCreate = async (input: CharacterInput) => {
    if (!session) return;
    setBusy(true);
    try {
      await createCharacter(session.user.id, input);
      router.replace('/characters');
    } catch (error) {
      showAlert('No se pudo crear', error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/characters'))}>
          <ThemedText type="link">← Cancelar</ThemedText>
        </Pressable>
        <ThemedText type="title">Nuevo personaje</ThemedText>
        <CharacterForm busy={busy} submitLabel="Crear personaje" onSubmit={handleCreate} />
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
});
