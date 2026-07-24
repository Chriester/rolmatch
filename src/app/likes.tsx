// «Te han dado like» (premium, estilo Tinder Gold): lista de mesas y
// jugadores que ya te dieron like. Los usuarios free ven el contador y las
// tarjetas difuminadas como teaser.

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
    return (
      <View style={styles.card}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumb}
            blurRadius={premium ? 0 : 18}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Text style={styles.thumbEmoji}>{item.kind === 'group' ? '🎲' : '🧙'}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {premium ? name : '● ● ● ● ●'}
          </ThemedText>
          <ThemedText type="small">{premium ? subtitle : 'Hazte premium para verlo'}</ThemedText>
        </View>
        {item.matched && (
          <ThemedText type="small" style={styles.matchedBadge}>
            💘 match
          </ThemedText>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <ThemedText type="title">💘 Te han dado like</ThemedText>

        {loadError ? (
          <View style={styles.centerBox}>
            <ThemedText style={styles.centerText}>No se pudo cargar.</ThemedText>
            <Pressable style={styles.retryButton} onPress={load}>
              <ThemedText>Reintentar</ThemedText>
            </Pressable>
          </View>
        ) : likes === undefined ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
          </View>
        ) : likes.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>🕰️</Text>
            <ThemedText style={styles.centerText}>
              Todavía nadie te ha dado like. Completa tu perfil y tu vitrina — todo llega.
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText type="small">
              {likes.length} {likes.length === 1 ? 'like recibido' : 'likes recibidos'}
              {premium ? '' : ' — con premium ves quiénes son antes de swipear'}
            </ThemedText>
            <FlatList
              data={likes}
              keyExtractor={(l) => `${l.kind}-${l.id}`}
              contentContainerStyle={styles.list}
              renderItem={renderItem}
            />
            {!premium && (
              <View style={styles.upsell}>
                <ThemedText type="small" style={styles.upsellText}>
                  ✨ Premium llega pronto. Los testers de la alpha lo tienen incluido.
                </ThemedText>
              </View>
            )}
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
    padding: Spacing.four,
    gap: Spacing.three,
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
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  thumbFallback: {
    backgroundColor: 'rgba(88,101,242,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 24,
  },
  matchedBadge: {
    color: '#3BD16F',
  },
  upsell: {
    backgroundColor: 'rgba(245,166,35,0.15)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.5)',
  },
  upsellText: {
    textAlign: 'center',
  },
});
