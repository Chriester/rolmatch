import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { signOut } from '@/lib/auth';
import { fetchProfileAlias, hasCompletedOnboarding } from '@/lib/profile';

export default function HomeScreen() {
  const session = useSession();
  const [alias, setAlias] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    hasCompletedOnboarding(session.user.id).then(setOnboarded).catch(() => setOnboarded(true));
    fetchProfileAlias(session.user.id).then(setAlias).catch(() => {});
  }, [session]);

  if (onboarded === undefined) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!onboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.centered}>
          {alias ? `¡Hola, ${alias}!` : '¡Hola!'}
        </ThemedText>
        <ThemedText style={styles.centered}>
          Tu perfil está listo. Aquí irá el feed de swipe: mesas buscando
          jugadores y jugadores buscando mesa.
        </ThemedText>
        <Link href="/feed" asChild>
          <Pressable style={styles.primaryButton}>
            <ThemedText style={styles.primaryLabel}>Buscar mesa</ThemedText>
          </Pressable>
        </Link>
        <Link href="/groups" asChild>
          <Pressable style={styles.secondaryButton}>
            <ThemedText>Mis mesas</ThemedText>
          </Pressable>
        </Link>
        <Link href="/matches" asChild>
          <Pressable style={styles.secondaryButton}>
            <ThemedText>Mis matches</ThemedText>
          </Pressable>
        </Link>
        <Pressable style={styles.signOutButton} onPress={signOut}>
          <ThemedText>Cerrar sesión</ThemedText>
        </Pressable>
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
  loading: {
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  centered: {
    textAlign: 'center',
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  signOutButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
});
