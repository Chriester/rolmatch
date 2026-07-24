import { Image } from 'expo-image';
import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { signOut } from '@/lib/auth';
import { registerPushToken } from '@/lib/notifications';
import { fetchProfileData, hasCompletedOnboarding } from '@/lib/profile';

export default function HomeScreen() {
  const session = useSession();
  const [alias, setAlias] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    hasCompletedOnboarding(session.user.id).then(setOnboarded).catch(() => setOnboarded(true));
    fetchProfileData(session.user.id)
      .then((profile) => {
        setAlias(profile.alias);
        setAvatarUrl(profile.avatar_url);
      })
      .catch(() => {});
    registerPushToken(session.user.id);
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
        <View style={styles.header}>
          {avatarUrl && <Image source={{ uri: avatarUrl }} style={styles.avatar} />}
          <ThemedText type="title" style={styles.centered}>
            {alias ? `¡Hola, ${alias}!` : '¡Hola!'}
          </ThemedText>
          <ThemedText type="small" style={styles.centered}>
            ¿Jugamos hoy?
          </ThemedText>
        </View>

        <View style={styles.menu}>
          <Link href="/feed" asChild>
            <Pressable style={styles.primaryButton}>
              <ThemedText style={styles.primaryLabel}>🎲 Buscar mesa</ThemedText>
            </Pressable>
          </Link>
          <Link href="/groups" asChild>
            <Pressable style={styles.secondaryButton}>
              <ThemedText>🛡️ Mis mesas</ThemedText>
            </Pressable>
          </Link>
          <Link href="/matches" asChild>
            <Pressable style={styles.secondaryButton}>
              <ThemedText>💬 Mis matches</ThemedText>
            </Pressable>
          </Link>
          <Link href="/onboarding" asChild>
            <Pressable style={styles.secondaryButton}>
              <ThemedText>👤 Editar perfil</ThemedText>
            </Pressable>
          </Link>
        </View>

        <Pressable style={styles.signOut} onPress={signOut}>
          <ThemedText type="small" style={styles.signOutLabel}>
            Cerrar sesión
          </ThemedText>
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
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  centered: {
    textAlign: 'center',
  },
  menu: {
    gap: Spacing.two,
  },
  primaryButton: {
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  signOut: {
    alignSelf: 'center',
  },
  signOutLabel: {
    textDecorationLine: 'underline',
  },
});
