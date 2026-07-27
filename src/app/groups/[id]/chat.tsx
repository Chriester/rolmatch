// Chat de texto por mesa, en tiempo real via Supabase Realtime — primer uso
// de postgres_changes en el proyecto. Discord deja de ser obligatorio: esta
// pantalla es el canal principal para hablar sin salir de la app.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { ChatInfoPanel } from '@/components/chat-info-panel';
import {
  ChatMediaPickers,
  gifSearchAvailable,
  type PickerTab,
} from '@/components/chat-media-pickers';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchGroup, type GroupDetail } from '@/lib/groups';
import {
  fetchMessages,
  sendMediaMessage,
  sendMessage,
  markChatRead,
  subscribeToMessages,
  unsubscribeFromMessages,
  type ChatMessage,
} from '@/lib/messages';

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [group, setGroup] = useState<GroupDetail | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[] | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<PickerTab | null>(null);
  const groupRef = useRef<GroupDetail | null | undefined>(undefined);

  useEffect(() => {
    groupRef.current = group;
  }, [group]);

  useEffect(() => {
    if (!id) return;
    fetchGroup(id)
      .then(setGroup)
      .catch(() => setGroup(null));
    fetchMessages(id)
      .then(setMessages)
      .catch(() => {
        setMessages([]);
        showAlert('No se pudo cargar el chat', 'Vuelve a entrar en unos segundos.');
      });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // El payload INSERT de Realtime no trae el embed de profiles: resolvemos
    // el alias/avatar contra el roster ya cargado en groupRef.
    const channel = subscribeToMessages(id, (row) => {
      setMessages((list) => {
        if (list?.some((m) => m.id === row.id)) return list;
        const sender = groupRef.current?.group_members.find((m) => m.user_id === row.sender_id);
        const message: ChatMessage = { ...row, profiles: sender?.profiles ?? null };
        return [message, ...(list ?? [])];
      });
      // Lo estoy viendo llegar: no debe contar como no-leído
      if (session) markChatRead(id, session.user.id);
    });
    return () => unsubscribeFromMessages(channel);
  }, [id, session]);

  // Entrar al chat marca todo como leído (badge de «Mis chats»)
  useEffect(() => {
    if (id && session) markChatRead(id, session.user.id);
  }, [id, session]);

  const handleSend = async () => {
    if (!id || !session || !draft.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(id, session.user.id, draft);
      setDraft('');
    } catch (error) {
      showAlert('No se pudo enviar', error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  const handleSendMedia = async (kind: 'gif' | 'sticker', content: { mediaUrl?: string; body?: string }) => {
    if (!id || !session || sending) return;
    setSending(true);
    setPickerTab(null);
    try {
      await sendMediaMessage(id, session.user.id, kind, content);
    } catch (error) {
      showAlert('No se pudo enviar', error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  if (group === undefined || messages === undefined) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (group === null) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ThemedText>No se pudo cargar la mesa.</ThemedText>
      </ThemedView>
    );
  }

  const iAmMember = group.group_members.some((m) => m.user_id === session?.user.id);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === session?.user.id;
    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        {(() => {
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

          if (isMine) {
            return media ? (
              <View style={styles.mediaWrap}>{media}</View>
            ) : (
              <View style={[styles.bubble, styles.bubbleMine]}>
                <Text style={styles.bubbleTextMine}>{item.body}</Text>
              </View>
            );
          }
          return media ? (
            <View style={styles.mediaWrap}>
              <Text style={styles.senderName}>{item.profiles?.alias ?? 'Jugador/a'}</Text>
              {media}
            </View>
          ) : (
            <View style={[styles.bubble, styles.bubbleTheirs]}>
              <Text style={styles.senderName}>{item.profiles?.alias ?? 'Jugador/a'}</Text>
              <Text style={styles.bubbleText}>{item.body}</Text>
            </View>
          );
        })()}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          onBack={() =>
            router.canGoBack()
              ? router.back()
              : router.replace({ pathname: '/groups/[id]', params: { id: id! } })
          }
        />
        <View style={styles.subheaderRow}>
          <Text numberOfLines={1} style={styles.subheader}>
            💬 {group.name}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.infoButton, pressed && styles.pressed]}
            onPress={() => setInfoOpen(true)}
            accessibilityLabel="Información de la mesa">
            <Text style={styles.infoGlyph}>i</Text>
          </Pressable>
        </View>

        {!iAmMember ? (
          <View style={styles.centerBox}>
            <ThemedText style={styles.centerText}>No eres miembro de esta mesa.</ThemedText>
          </View>
        ) : (
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
                    Sin mensajes todavía. Sé el primero en escribir.
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
                  // En web, Enter envia y Shift+Enter mete salto de linea;
                  // en nativo el intro de un input multiline no dispara esto.
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
        )}
      </SafeAreaView>

      <ChatInfoPanel visible={infoOpen} group={group} onClose={() => setInfoOpen(false)} />
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
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: Spacing.two,
  },
  subheader: {
    color: '#fff',
    fontSize: 16,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    flexShrink: 1,
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Rolder.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoGlyph: {
    color: Rolder.violet,
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '800',
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
  senderName: {
    color: Rolder.violetSoft,
    fontSize: 11,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
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
