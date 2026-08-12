// Mis chats: entrada directa a los chats de todas mis mesas, con el
// último mensaje como preview — sin pasar por mesa → abrir chat.

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchChatRows, type ChatRow } from '@/lib/chats-overview';
import { warmGroupChat } from '@/lib/prefetch';
import { cacheGet, cacheSet } from '@/lib/screen-cache';
import { webPushState } from '@/lib/web-push';

function timeLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

type ChatFilter = 'all' | 'group' | 'dm';

const FILTERS: { key: ChatFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'group', label: 'Mesas' },
  { key: 'dm', label: 'Privados' },
];

export default function ChatsScreen() {
  const session = useSession();
  const [chats, setChats] = useState<ChatRow[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  // «Todos» por defecto a propósito: separar mesas y privados no debe costar
  // un toque extra en el caso normal, que es abrir la conversación de arriba.
  const [filter, setFilter] = useState<ChatFilter>('all');

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    // stale-while-revalidate: enseña la última lista al instante (nada de
    // rueda en cada visita al tab) y refresca en silencio por detrás
    const cacheKey = `chats:${session.user.id}`;
    const cached = cacheGet<ChatRow[]>(cacheKey);
    if (cached) setChats((current) => current ?? cached);
    fetchChatRows(session.user.id)
      .then((merged) => {
        cacheSet(cacheKey, merged);
        setChats(merged);
        // precalienta las mesas más activas: tocar un chat abre el hub con
        // la ficha y el historial ya en caché, sin página en blanco
        merged
          .filter((c) => c.kind === 'group')
          .slice(0, 6)
          .forEach((c) => c.kind === 'group' && warmGroupChat(c.groupId));
      })
      .catch(() => setLoadError(true));
  }, [session]);

  useFocusEffect(load);

  const visible = (chats ?? []).filter((c) => filter === 'all' || c.kind === filter);
  const unreadIn = (kind: ChatFilter) =>
    (chats ?? [])
      .filter((c) => kind === 'all' || c.kind === kind)
      .reduce((total, c) => total + c.unread, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader />
        <ScreenTitle>💬 Mis chats</ScreenTitle>

        {['ready', 'ios-install'].includes(webPushState()) && (
          <Pressable style={styles.pushBanner} onPress={() => router.push('/settings')}>
            <Text style={styles.pushBannerText}>
              🔔 Activa las notificaciones para no perderte matches ni mensajes ›
            </Text>
          </Pressable>
        )}

        {/* Mesas y privados se distinguen ya por la forma del avatar; estos
            chips son para cuando quieres SOLO uno de los dos. El contador de
            cada uno evita que separar te haga perder de vista lo del otro. */}
        {chats !== undefined && chats.length > 0 && (
          <View style={styles.filterRow}>
            {FILTERS.map((option) => {
              const unread = unreadIn(option.key);
              const active = filter === option.key;
              return (
                <Pressable
                  key={option.key}
                  accessibilityLabel={
                    unread > 0
                      ? `${option.label}, ${unread} sin leer`
                      : option.label
                  }
                  accessibilityState={{ selected: active }}
                  style={[styles.filter, active && styles.filterActive]}
                  onPress={() => setFilter(option.key)}>
                  <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                    {option.label}
                  </Text>
                  {unread > 0 && (
                    <View style={styles.filterDot}>
                      <Text style={styles.filterDotLabel}>{unread >= 99 ? '99+' : unread}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {loadError && chats === undefined ? (
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
        ) : visible.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>{filter === 'dm' ? '✉️' : '🎲'}</Text>
            <Text style={styles.empty}>
              {filter === 'dm'
                ? 'Ningún privado todavía. Puedes escribir a cualquier compañero desde su perfil.'
                : 'Ninguna mesa con chat todavía.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(c) => (c.kind === 'group' ? `g-${c.groupId}` : `d-${c.threadId}`)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ListRow
                onPress={() =>
                  item.kind === 'group'
                    ? router.push({
                        pathname: '/groups/[id]/chat',
                        params: { id: item.groupId },
                      })
                    : router.push({ pathname: '/dm/[id]', params: { id: item.threadId } })
                }>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={[styles.thumb, item.kind === 'dm' && styles.thumbDm]}
                  />
                ) : (
                  <View
                    style={[
                      styles.thumb,
                      item.kind === 'dm' && styles.thumbDm,
                      styles.thumbFallback,
                    ]}>
                    <Text style={styles.thumbEmoji}>{item.kind === 'dm' ? '🧙' : '🎲'}</Text>
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
                  <Text
                    style={[styles.preview, item.unread > 0 && styles.previewUnread]}
                    numberOfLines={1}>
                    {item.lastMessage
                      ? item.kind === 'group'
                        ? `${item.lastMessage.sender ?? 'Alguien'}: ${item.lastMessage.body}`
                        : item.lastMessage.body
                      : 'Sin mensajes todavía — rompe el hielo.'}
                  </Text>
                </View>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeLabel}>
                      {item.unread >= 99 ? '99+' : item.unread}
                    </Text>
                  </View>
                )}
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
  pushBanner: {
    backgroundColor: 'rgba(139,108,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pushBannerText: {
    color: Rolder.violetSofter,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
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
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: 20,
    paddingBottom: Spacing.two,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterActive: {
    borderColor: Rolder.violetSoft,
    backgroundColor: 'rgba(139,108,255,0.18)',
  },
  filterLabel: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  filterLabelActive: {
    color: '#fff',
  },
  filterDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: Rolder.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDotLabel: {
    color: '#fff',
    fontSize: 9.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
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
  thumbDm: {
    borderRadius: 27,
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
  previewUnread: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: Rolder.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    color: '#fff',
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
});
