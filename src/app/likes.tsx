// «Te han dado like» (handoff §10): contador, banner premium dorado para
// free con filas difuminadas; con premium, nombres visibles y badge match.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, ScreenTitle, StatusPill } from '@/components/ui';
import { Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchPremiumStatus, fetchReceivedLikes, type ReceivedLike } from '@/lib/premium';

const MAX_WIDTH = 480;

export default function LikesScreen() {
  const session = useSession();
  const [likes, setLikes] = useState<ReceivedLike[] | undefined>(undefined);
  const [premium, setPremium] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    setLikes(undefined);
    Promise.all([
      fetchReceivedLikes(session.user.id),
      fetchPremiumStatus(session.user.id),
    ])
      .then(([received, status]) => {
        setLikes(received);
        setPremium(status.active);
      })
      .catch(() => setLoadError(true));
  }, [session]);

  useFocusEffect(load);

  const renderItem = ({ item }: { item: ReceivedLike }) => {
    const name = item.kind === 'group' ? item.name : item.alias;
    const subtitle =
      item.kind === 'group' ? 'Esta mesa quiere ficharte' : `Quiere jugar en «${item.groupName}»`;
    // solo premium ve la identidad → solo premium puede navegar al perfil
    const openProfile = premium
      ? () =>
          item.kind === 'group'
            ? router.push({ pathname: '/groups/[id]', params: { id: item.id } })
            : router.push({ pathname: '/players/[id]', params: { id: item.id } })
      : undefined;
    return (
      <ListRow onPress={openProfile}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumb}
            blurRadius={premium ? 0 : 18}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback, !premium && styles.thumbBlurred]}>
            <Text style={styles.thumbEmoji}>{item.kind === 'group' ? '🎲' : '🧙'}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={1}>
            {premium ? name : '● ● ● ● ●'}
          </Text>
          <Text style={styles.meta}>{premium ? subtitle : 'Hazte premium para verlo'}</Text>
        </View>
        {item.matched && <StatusPill label="💘 MATCH" tone="violet" />}
      </ListRow>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <ScreenTitle>💘 Te han dado like</ScreenTitle>

        {loadError ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerText}>No se pudo cargar.</Text>
            <OutlineButton label="Reintentar" onPress={load} />
          </View>
        ) : likes === undefined ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
          </View>
        ) : likes.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>🕰️</Text>
            <Text style={styles.centerText}>
              Todavía nadie te ha dado like. Completa tu perfil y tu vitrina — todo llega.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.counter}>
              {likes.length} {likes.length === 1 ? 'like te espera' : 'likes te esperan'}
            </Text>

            {!premium && (
              <LinearGradient
                colors={Rolder.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upsell}>
                <Text style={styles.upsellText}>
                  ✨ Hazte premium para ver quiénes son antes de swipear. Los testers de la alpha
                  lo tienen incluido — canjea tu código.
                </Text>
              </LinearGradient>
            )}

            <FlatList
              data={likes}
              keyExtractor={(l) => `${l.kind}-${l.id}`}
              contentContainerStyle={styles.list}
              renderItem={renderItem}
            />
          </>
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
    maxWidth: MAX_WIDTH,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: Spacing.two,
    gap: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  centerEmoji: {
    fontSize: 56,
  },
  centerText: {
    color: Rolder.textSecondary,
    fontSize: 13.5,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
  },
  counter: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
  },
  upsell: {
    borderRadius: 14,
    padding: 14,
  },
  upsellText: {
    color: Rolder.onGold,
    fontSize: 13,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    gap: 12,
    paddingBottom: Spacing.four,
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
    backgroundColor: 'rgba(139,108,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBlurred: {
    opacity: 0.5,
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
});
