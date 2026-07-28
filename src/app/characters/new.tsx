import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { CharacterForm } from '@/components/character-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { createCharacter, type CharacterInput } from '@/lib/characters';
import { fetchPremiumStatus } from '@/lib/premium';
import { fetchXpTotals, levelFromXp } from '@/lib/xp';

export default function NewCharacterScreen() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [themeStatus, setThemeStatus] = useState({ isPremium: false, level: 1 });

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    Promise.all([
      fetchPremiumStatus(userId).catch(() => ({ active: false })),
      fetchXpTotals([userId]).catch(() => new Map<string, number>()),
    ]).then(([premium, xp]) =>
      setThemeStatus({ isPremium: premium.active, level: levelFromXp(xp.get(userId) ?? 0) })
    );
  }, [session]);

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
        <AppHeader
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/characters'))}
        />
        <ThemedText type="title">Nuevo personaje</ThemedText>
        {session && (
          <CharacterForm
            userId={session.user.id}
            busy={busy}
            submitLabel="Crear personaje"
            onSubmit={handleCreate}
            themeStatus={themeStatus}
          />
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
});
