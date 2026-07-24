import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchMyMatches, matchChannelUrl, type MyMatch } from '@/lib/matches';

export default function MatchesScreen() {
  const session = useSession();
  const [matches, setMatches] = useState<MyMatch[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    setMatches(undefined);
    fetchMyMatches(session.user.id)
      .then(setMatches)
      .catch(() => setLoadError(true));
  }, [session]);

  useFocusEffect(load);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader />
        <ThemedText type="title">Mis matches</ThemedText>

        {loadError ? (
          <View style={styles.errorBox}>
            <ThemedText style={styles.empty}>No se pudieron cargar tus matches.</ThemedText>
            <Pressable style={styles.retryButton} onPress={load}>
              <ThemedText>Reintentar</ThemedText>
            </Pressable>
          </View>
        ) : matches === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : matches.length === 0 ? (
          <ThemedText style={styles.empty}>
            Todavía no tienes matches. Dale a «Buscar mesa» y cuando una mesa y tú
            os intereséis mutuamente, aparecerá aquí.
          </ThemedText>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(m) => `${m.side}-${m.id}`}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const url = matchChannelUrl(item);
              return (
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback]}>
                        <ThemedText>{item.side === 'player' ? '🎲' : '🧙'}</ThemedText>
                      </View>
                    )}
                    <View style={styles.cardBody}>
                      <ThemedText type="subtitle" numberOfLines={1}>
                        {item.side === 'player'
                          ? item.counterpart
                          : `${item.counterpart} → ${item.groupName}`}
                      </ThemedText>
                      <ThemedText type="small">
                        {item.side === 'player'
                          ? 'Has hecho match con esta mesa'
                          : 'Candidato/a para tu mesa'}{' '}
                        · {new Date(item.matched_at).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  {url ? (
                    <Pressable style={styles.channelButton} onPress={() => Linking.openURL(url)}>
                      <ThemedText style={styles.channelLabel}>Abrir canal en Discord</ThemedText>
                    </Pressable>
                  ) : (
                    <ThemedText type="small">
                      El canal de Discord se creará en unos segundos…
                    </ThemedText>
                  )}
                </View>
              );
            }}
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
    gap: Spacing.two,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  thumbFallback: {
    backgroundColor: 'rgba(88,101,242,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelButton: {
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
  channelLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
