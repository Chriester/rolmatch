// Mis matches (handoff §11): tarjetas con thumb, título y botón al canal
// de Discord (o estado de «creándose»).

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { DiscordButton, ListRow, OutlineButton, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { DISCORD_ENABLED } from '@/lib/config';
import { fetchMyMatches, matchChannelUrl, type MyMatch } from '@/lib/matches';
import { cacheGet, cacheSet } from '@/lib/screen-cache';

export default function MatchesScreen() {
  const session = useSession();
  // arranca con lo último visto y refresca en silencio (patrón screen-cache)
  const [matches, setMatches] = useState<MyMatch[] | undefined>(() =>
    session ? cacheGet(`matches:${session.user.id}`) : undefined
  );
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    fetchMyMatches(session.user.id)
      .then((list) => {
        cacheSet(`matches:${session.user.id}`, list);
        setMatches(list);
      })
      .catch(() => setLoadError(true));
  }, [session]);

  useFocusEffect(load);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader onBack={router.canGoBack() ? () => router.back() : undefined} />
        <ScreenTitle>Mis matches</ScreenTitle>

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.empty}>No se pudieron cargar tus matches.</Text>
            <OutlineButton label="Reintentar" onPress={load} />
          </View>
        ) : matches === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : matches.length === 0 ? (
          <Text style={styles.empty}>
            Todavía no tienes matches. Dale a swipear y cuando una mesa y tú os intereséis
            mutuamente, aparecerá aquí.
          </Text>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(m) => `${m.side}-${m.id}`}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const url = matchChannelUrl(item);
              const openProfile = () => {
                if (item.side === 'player' && item.targetGroupId) {
                  router.push({ pathname: '/groups/[id]', params: { id: item.targetGroupId } });
                } else if (item.targetUserId) {
                  router.push({ pathname: '/players/[id]', params: { id: item.targetUserId } });
                }
              };
              return (
                <ListRow style={styles.card} onPress={openProfile}>
                  <View style={styles.cardRow}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback]}>
                        <Text style={styles.thumbEmoji}>
                          {item.side === 'player' ? '🎲' : '🧙'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardBody}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.side === 'player'
                          ? item.counterpart
                          : `${item.counterpart} → ${item.groupName}`}
                      </Text>
                      <Text style={styles.meta}>
                        {item.side === 'player'
                          ? 'Has hecho match con esta mesa'
                          : 'Candidato/a para tu mesa'}{' '}
                        · {new Date(item.matched_at).toLocaleDateString()}
                      </Text>
                      <Text style={styles.profileHint}>
                        {item.side === 'player' ? 'Ver la mesa ›' : 'Ver su perfil ›'}
                      </Text>
                    </View>
                  </View>
                  {!DISCORD_ENABLED ? null : url ? (
                    <DiscordButton label="Abrir canal en Discord" onPress={() => Linking.openURL(url)} />
                  ) : (
                    <Text style={styles.pending}>El canal de Discord se creará en unos segundos…</Text>
                  )}
                </ListRow>
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
    paddingHorizontal: 20,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    width: '100%',
  },
  loading: {
    marginTop: Spacing.six,
  },
  errorBox: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
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
  card: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  thumbFallback: {
    backgroundColor: 'rgba(199,125,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 24,
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
  pending: {
    color: Rolder.textTertiary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  profileHint: {
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
  },
});
