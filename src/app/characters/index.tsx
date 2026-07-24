import { Image } from 'expo-image';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  CHARACTER_STATUS_LABELS,
  fetchMyCharacters,
  type Character,
} from '@/lib/characters';

export default function MyCharactersScreen() {
  const session = useSession();
  const [characters, setCharacters] = useState<Character[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    setCharacters(undefined);
    fetchMyCharacters(session.user.id)
      .then(setCharacters)
      .catch(() => setLoadError(true));
  }, [session]);

  useFocusEffect(load);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <ThemedText type="link">← Volver</ThemedText>
        </Pressable>
        <View style={styles.header}>
          <ThemedText type="title">Mis personajes</ThemedText>
          <Link href="/characters/new" asChild>
            <Pressable style={styles.primaryButton}>
              <ThemedText style={styles.primaryLabel}>Crear personaje</ThemedText>
            </Pressable>
          </Link>
        </View>

        {loadError ? (
          <View style={styles.errorBox}>
            <ThemedText style={styles.empty}>No se pudieron cargar tus personajes.</ThemedText>
            <Pressable style={styles.retryButton} onPress={load}>
              <ThemedText>Reintentar</ThemedText>
            </Pressable>
          </View>
        ) : characters === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : characters.length === 0 ? (
          <ThemedText style={styles.empty}>
            Tu vitrina está vacía. Crea tu primer personaje: los GMs verán los que
            estén «buscando mesa» cuando aparezcas como candidato.
          </ThemedText>
        ) : (
          <FlatList
            data={characters}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: '/characters/[id]', params: { id: item.id } })
                }>
                <View style={styles.cardHeader}>
                  <View style={styles.identity}>
                    {item.portrait_url && (
                      <Image source={{ uri: item.portrait_url }} style={styles.portrait} />
                    )}
                    <ThemedText type="subtitle">{item.name}</ThemedText>
                  </View>
                  <ThemedText type="small">{CHARACTER_STATUS_LABELS[item.status]}</ThemedText>
                </View>
                <ThemedText type="small">
                  {[item.systems?.name, item.archetype, item.level && `nivel ${item.level}`]
                    .filter(Boolean)
                    .join(' · ') || 'Sin detalles todavía'}
                </ThemedText>
                {item.concept && <ThemedText type="small">{item.concept}</ThemedText>}
              </Pressable>
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  errorBox: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  portrait: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  primaryButton: {
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
