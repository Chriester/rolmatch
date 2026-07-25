// Mis chats: entrada directa a los chats de todas mis mesas, con el
// último mensaje como preview — sin pasar por mesa → abrir chat.

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchMyChats, type ChatSummary } from '@/lib/messages';

function timeLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function ChatsScreen() {
  const session = useSession();
  const [chats, setChats] = useState<ChatSummary[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    setChats(undefined);
    fetchMyChats(session.user.id)
      .then(setChats)
      .catch(() => setLoadError(true));
  }, [session]);

  useFocusEffect(load);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <ScreenTitle>💬 Mis chats</ScreenTitle>

        {loadError ? (
          <View style={styles.centerBox}>
            <Text style={styles.empty}>No se pudieron cargar tus chats.</Text>
            <OutlineButton label="Reintentar" onPress={load} />
          </View>
        ) : chats === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : chats.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>🕸️</Text>
            <Text style={styles.empty}>
              Todavía no estás en ninguna mesa. Cuando hagas match con una, su chat aparecerá
              aquí.
            </Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(c) => c.groupId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ListRow
                onPress={() =>
                  router.push({ pathname: '/groups/[id]/chat', params: { id: item.groupId } })
                }>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Text style={styles.thumbEmoji}>🎲</Text>
                  </View>
                )}
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.lastMessage && (
                      <Text style={styles.time}>{timeLabel(item.lastMessage.created_at)}</Text>
                    )}
                  </View>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage
                      ? `${item.lastMessage.sender ?? 'Alguien'}: ${item.lastMessage.body}`
                      : 'Sin mensajes todavía — rompe el hielo.'}
                  </Text>
                </View>
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
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  loading: {
    marginTop: Spacing.six,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centerEmoji: {
    fontSize: 56,
  },
  empty: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    flexShrink: 1,
  },
  time: {
    color: Rolder.textTertiary,
    fontSize: 11,
    fontFamily: RolderFonts.regular,
  },
  preview: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
});
