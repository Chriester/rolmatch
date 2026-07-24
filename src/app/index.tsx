import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const session = useSession();
  const [alias, setAlias] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('alias')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setAlias(data?.alias ?? null));
  }, [session]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.centered}>
          {alias ? `¡Hola, ${alias}!` : '¡Hola!'}
        </ThemedText>
        <ThemedText style={styles.centered}>
          Tu cuenta está conectada. Aquí irá el feed de swipe: mesas buscando
          jugadores y jugadores buscando mesa.
        </ThemedText>
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
