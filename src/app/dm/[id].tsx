// Chat 1-a-1 en tiempo real. Misma mecánica que el chat de mesa (Realtime,
// emojis/stickers/GIFs, no-leídos) pero entre dos personas; la cabecera
// lleva al perfil del otro.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { Image } from 'expo-image';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import {
  ChatMediaPickers,
  gifSearchAvailable,
  type PickerTab,
} from '@/components/chat-media-pickers';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  fetchDmMessages,
  fetchDmThread,
  markDmRead,
  sendDmMediaMessage,
  sendDmMessage,
  subscribeToDmMessages,
  unsubscribeFromDmMessages,
  type DmMessage,
  type DmThread,
} from '@/lib/dm';

export default function DmChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [thread, setThread] = useState<DmThread | null | undefined>(undefined);
  const [messages, setMessages] = useState<DmMessage[] | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerTab, setPickerTab] = useState<PickerTab | null>(null);

  useEffect(() => {
    if (!id || !session) return;
    fetchDmThread(id, session.user.id)
      .then(setThread)
      .catch(() => setThread(null));
    fetchDmMessages(id)
      .then(setMessages)
      .catch(() => {
        setMessages([]);
        showAlert('No se pudo cargar el chat', 'Vuelve a entrar en unos segundos.');
      });
  }, [id, session]);

  useEffect(() => {
    if (!id) return;
    const channel = subscribeToDmMessages(id, (row) => {
      setMessages((list) => {
        if (list?.some((m) => m.id === row.id)) return list;
        return [row, ...(list ?? [])];
      });
      // Lo estoy viendo llegar: no debe contar como no-leído
      if (session) markDmRead(id, session.user.id);
    });
    return () => unsubscribeFromDmMessages(channel);
  }, [id, session]);

  // Entrar al chat marca todo como leído (badge de «Mis chats»)
  useEffect(() => {
    if (id && session) markDmRead(id, session.user.id);
  }, [id, session]);

  const handleSend = async () => {
    if (!id || !session || !draft.trim() || sending) return;
    setSending(true);
    try {
      await sendDmMessage(id, session.user.id, draft);
      setDraft('');
    } catch (error) {
      showAlert('No se pudo enviar', error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  const handleSendMedia = async (
    kind: 'gif' | 'sticker',
    content: { mediaUrl?: string; body?: string }
  ) => {
    if (!id || !session || sending) return;
    setSending(true);
    setPickerTab(null);
    try {
      await sendDmMediaMessage(id, session.user.id, kind, content);
    } catch (error) {
      showAlert('No se pudo enviar', error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  if (thread === undefined || messages === undefined) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (thread === null) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ThemedText>No se pudo cargar el chat.</ThemedText>
      </ThemedView>
    );
  }

  const renderItem = ({ item }: { item: DmMessage }) => {
    const isMine = item.sender_id === session?.user.id;
    const media =
      item.kind === 'gif' && item.media_url ? (
        <Image source={{ uri: item.media_url }} style={styles.gifMessage} contentFit="cover" />
      ) : item.kind === 'sticker' ? (
        item.media_url ? (
          <Image source={{ uri: item.media_url }} style={styles.stickerImage} contentFit="contain" />
        ) : (
          <Text style={styles.stickerMessage}>{item.body ?? '🎟️'}</Text>
        )
      ) : null;

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        {media ? (
          <View style={styles.mediaWrap}>{media}</View>
        ) : (
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={isMine ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/chats'))}
        />
        <Pressable
          style={styles.subheaderRow}
          accessibilityLabel={`Ver perfil de ${thread.otherAlias}`}
          onPress={() =>
            router.push({ pathname: '/players/[id]', params: { id: thread.otherId } })
          }>
          {thread.otherAvatarUrl ? (
            <Image source={{ uri: thread.otherAvatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Text style={styles.headerAvatarEmoji}>🧙</Text>
            </View>
          )}
          <Text numberOfLines={1} style={styles.subheader}>
            {thread.otherAlias}
          </Text>
          <Text style={styles.profileHint}>ver perfil ›</Text>
        </Pressable>

        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <FlatList
            style={styles.list}
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.centerBox}>
                <ThemedText style={styles.centerText}>
                  Sin mensajes todavía. Rompe el hielo 🎲
                </ThemedText>
              </View>
            }
          />
          {pickerTab !== null && (
            <ChatMediaPickers
              tab={pickerTab}
              onEmoji={(e) => setDraft((d) => d + e)}
              onSticker={(s) => handleSendMedia('sticker', { body: s })}
              onGif={(url) => handleSendMedia('gif', { mediaUrl: url })}
            />
          )}
          <View style={styles.pickerTabs}>
            <Pressable
              style={[styles.tabButton, pickerTab === 'emoji' && styles.tabActive]}
              onPress={() => setPickerTab(pickerTab === 'emoji' ? null : 'emoji')}
              accessibilityLabel="Emojis">
              <Text style={styles.tabGlyph}>😀</Text>
            </Pressable>
            <Pressable
              style={[styles.tabButton, pickerTab === 'sticker' && styles.tabActive]}
              onPress={() => setPickerTab(pickerTab === 'sticker' ? null : 'sticker')}
              accessibilityLabel="Stickers">
              <Text style={styles.tabGlyph}>🎟️</Text>
            </Pressable>
            {gifSearchAvailable && (
              <Pressable
                style={[styles.tabButton, pickerTab === 'gif' && styles.tabActive]}
                onPress={() => setPickerTab(pickerTab === 'gif' ? null : 'gif')}
                accessibilityLabel="GIFs">
                <Text style={styles.tabLabel}>GIF</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.composerRow}>
            <TextInput
              style={[styles.input, styles.composerInput]}
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe un mensaje…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
              onKeyPress={(e) => {
                // En web, Enter envía y Shift+Enter mete salto de línea
                if (Platform.OS !== 'web') return;
                const native = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                if (native.key === 'Enter' && !native.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Pressable
              style={({ pressed }) => [
                (sending || !draft.trim()) && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={handleSend}
              disabled={sending || !draft.trim()}>
              <LinearGradient
                colors={[Rolder.violet, Rolder.discord]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButton}>
                <Text style={styles.sendLabel}>➤</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
  subheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Spacing.two,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerAvatarFallback: {
    backgroundColor: 'rgba(139,108,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEmoji: {
    fontSize: 16,
  },
  subheader: {
    color: '#fff',
    fontSize: 16,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    flexShrink: 1,
  },
  profileHint: {
    color: Rolder.violetSoft,
    fontSize: 11.5,
    fontFamily: RolderFonts.semibold,
  },
  chatArea: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    flexGrow: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 13,
    gap: 2,
  },
  bubbleMine: {
    backgroundColor: Rolder.violet,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
    lineHeight: 20,
  },
  mediaWrap: {
    gap: 2,
  },
  gifMessage: {
    width: 200,
    height: 150,
    borderRadius: 14,
    backgroundColor: Rolder.surface,
  },
  stickerMessage: {
    fontSize: 56,
    lineHeight: 66,
  },
  stickerImage: {
    width: 96,
    height: 96,
  },
  pickerTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: Spacing.two,
  },
  tabButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: {
    backgroundColor: 'rgba(139,108,255,0.3)',
  },
  tabGlyph: {
    fontSize: 16,
  },
  tabLabel: {
    color: Rolder.violetSofter,
    fontSize: 13,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    lineHeight: 20,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  input: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
