import { Image } from 'expo-image';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { FORMAT_LABELS, fetchMyGroups, type GroupSummary } from '@/lib/groups';

export default function MyGroupsScreen() {
  const session = useSession();
  const [groups, setGroups] = useState<GroupSummary[] | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      fetchMyGroups(session.user.id)
        .then(setGroups)
        .catch(() => setGroups([]));
    }, [session])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader />
        <View style={styles.header}>
          <ThemedText type="title">Mis mesas</ThemedText>
          <Link href="/groups/new" asChild>
            <Pressable style={styles.primaryButton}>
              <ThemedText style={styles.primaryLabel}>Crear mesa</ThemedText>
            </Pressable>
          </Link>
        </View>

        {groups === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : groups.length === 0 ? (
          <ThemedText style={styles.empty}>
            Aún no tienes ninguna mesa. Crea una y empieza a buscar jugadores.
          </ThemedText>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(g) => g.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.id } })}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <ThemedText>🎲</ThemedText>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <ThemedText type="subtitle" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="small">
                    {item.systems?.name ?? 'Sistema sin definir'} · {FORMAT_LABELS[item.format]}
                    {item.is_active ? '' : ' · inactiva'}
                  </ThemedText>
                </View>
                <ThemedText type="small" style={styles.chevron}>
                  ›
                </ThemedText>
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
  list: {
    gap: Spacing.two,
  },
  card: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Spacing.two,
  },
  thumbFallback: {
    backgroundColor: 'rgba(88,101,242,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    opacity: 0.5,
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
