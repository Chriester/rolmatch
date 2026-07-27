// Mis mesas (handoff §13): filas con thumb, meta y acciones; tarjeta
// punteada para crear mesa nueva.

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, ScreenTitle, StatusPill } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
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
        <ScreenTitle>🛡️ Mis mesas</ScreenTitle>

        {groups === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(g) => g.id}
            contentContainerStyle={styles.list}
            ListFooterComponent={
              <ListRow dashed onPress={() => router.push('/groups/new')}>
                <Text style={styles.dashedLabel}>+ Crear mesa</Text>
              </ListRow>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                Aún no tienes ninguna mesa. Crea una y empieza a buscar jugadores.
              </Text>
            }
            renderItem={({ item }) => (
              <ListRow
                onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.id } })}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Text style={styles.thumbEmoji}>🎲</Text>
                  </View>
                )}
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.systems?.name ?? 'Sistema sin definir'} · {FORMAT_LABELS[item.format]}
                  </Text>
                  <View style={styles.actions}>
                    <StatusPill
                      label={item.is_active ? 'ACTIVA' : 'INACTIVA'}
                      tone={item.is_active ? 'green' : 'gray'}
                    />
                  </View>
                </View>
                <OutlineButton
                  label="⚔ Candidatos"
                  onPress={() =>
                    router.push({ pathname: '/groups/[id]/candidates', params: { id: item.id } })
                  }
                  style={styles.candidatesButton}
                />
              </ListRow>
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
    paddingHorizontal: 20,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    width: '100%',
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginVertical: Spacing.four,
  },
  list: {
    gap: 12,
    paddingBottom: Spacing.four,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  thumbFallback: {
    backgroundColor: 'rgba(139,108,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 24,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  meta: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 3,
  },
  candidatesButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dashedLabel: {
    color: Rolder.violetSofter,
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
