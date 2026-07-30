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

import { confirmAction, showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { ChatInfoPanel } from '@/components/chat-info-panel';
import { ChatPollBanner } from '@/components/chat-poll-banner';
import { DiceRoller } from '@/components/dice-roller';
import { MessageActions } from '@/components/message-actions';
import { RollBubble } from '@/components/roll-bubble';
import { parseRoll, type DiceRoll } from '@/lib/dice';
import { fetchPolls, type SessionPoll } from '@/lib/polls';
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
  deleteMessage,
  editMessage,
  fetchMessages,
  sendMediaMessage,
  sendMessage,
  sendRollMessage,
  markChatRead,
  subscribeToMessages,
  unsubscribeFromMessages,
  type ChatMessage,
} from '@/lib/messages';
import { cacheGet, cacheSet } from '@/lib/screen-cache';
import { joinTypingChannel, leaveTypingChannel, type TypingHandle } from '@/lib/typing';

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  // arranca con lo último visto (si lo hay) para no enseñar la rueda al
  // volver a un chat ya visitado; el fetch de abajo refresca en silencio
  const [group, setGroup] = useState<GroupDetail | null | undefined>(() =>
    id ? cacheGet(`group:${id}`) : undefined
  );
  const [messages, setMessages] = useState<ChatMessage[] | undefined>(() =>
    id ? cacheGet(`group-msgs:${id}`) : undefined
  );
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activePolls, setActivePolls] = useState<SessionPoll[]>([]);
  const [pickerTab, setPickerTab] = useState<PickerTab | 'dice' | null>(null);
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [typingAlias, setTypingAlias] = useState<string | null>(null);
  const groupRef = useRef<GroupDetail | null | undefined>(undefined);
  const typingRef = useRef<TypingHandle | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    groupRef.current = group;
  }, [group]);

  useEffect(() => {
    if (!id) return;
    fetchGroup(id)
      .then((g) => {
        cacheSet(`group:${id}`, g);
        setGroup(g);
      })
      .catch(() => setGroup((current) => current ?? null));
    fetchMessages(id)
      .then((list) => {
        cacheSet(`group-msgs:${id}`, list);
        setMessages(list);
      })
      .catch(() => {
        const cached = cacheGet<ChatMessage[]>(`group-msgs:${id}`);
        if (!cached) showAlert('No se pudo cargar el chat', 'Vuelve a entrar en unos segundos.');
        setMessages((current) => current ?? cached ?? []);
      });
  }, [id]);

  // Votaciones abiertas → un banner desplegable por cada una
  useEffect(() => {
    if (!id || !session) return;
    fetchPolls(id, session.user.id)
      .then((polls) => setActivePolls(polls.filter((p) => p.status === 'open')))
      .catch(() => {});
  }, [id, session]);

  useEffect(() => {
    if (!id) return;
    // El payload INSERT de Realtime no trae el embed de profiles: resolvemos
    // el alias/avatar contra el roster ya cargado en groupRef.
    const channel = subscribeToMessages(id, {
      onInsert: (row) => {
        setMessages((list) => {
          if (list?.some((m) => m.id === row.id)) return list;
          const sender = groupRef.current?.group_members.find((m) => m.user_id === row.sender_id);
          const message: ChatMessage = { ...row, profiles: sender?.profiles ?? null };
          return [message, ...(list ?? [])];
        });
        // Lo estoy viendo llegar: no debe contar como no-leído
        if (session) markChatRead(id, session.user.id);
      },
      onUpdate: (row) =>
        setMessages((list) =>
          list?.map((m) => (m.id === row.id ? { ...m, ...row, profiles: m.profiles } : m))
        ),
      onDelete: (deletedId) =>
        setMessages((list) => list?.filter((m) => m.id !== deletedId)),
    });
    return () => unsubscribeFromMessages(channel);
  }, [id, session]);

  // Canal efímero de «escribiendo…»
  useEffect(() => {
    if (!id || !session) return;
    const handle = joinTypingChannel(`group:${id}`, session.user.id, (alias) => {
      setTypingAlias(alias);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingAlias(null), 3500);
    });
    typingRef.current = handle;
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingRef.current = null;
      leaveTypingChannel(handle);
    };
  }, [id, session]);

  // Entrar al chat marca todo como leído (badge de «Mis chats»)
  useEffect(() => {
    if (id && session) markChatRead(id, session.user.id);
  }, [id, session]);

  const handleSend = async () => {
    if (!id || !session || !draft.trim() || sending) return;
    setSending(true);
    try {
      if (editing) {
        const body = draft.trim();
        await editMessage(editing.id, body);
        const editedId = editing.id;
        setMessages((list) =>
          list?.map((m) =>
            m.id === editedId ? { ...m, body, edited_at: new Date().toISOString() } : m
          )
        );
        setEditing(null);
      } else {
        await sendMessage(id, session.user.id, draft);
      }
      setDraft('');
    } catch (error) {
      showAlert('No se pudo enviar', error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  const handleDraftChange = (text: string) => {
    setDraft(text);
    if (text.trim() && session) {
      const me = groupRef.current?.group_members.find((m) => m.user_id === session.user.id);
      typingRef.current?.sendTyping(me?.profiles?.alias ?? 'Alguien');
    }
  };

  const handleSendRoll = async (roll: DiceRoll) => {
    if (!id || !session || sending) return;
    setSending(true);
    setPickerTab(null);
    try {
      await sendRollMessage(id, session.user.id, roll);
    } catch (error) {
      showAlert('No se pudo tirar', error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (message: ChatMessage) => {
    setActionsFor(null);
    const ok = await confirmAction('¿Borrar mensaje?', 'Desaparecerá para toda la mesa.', 'Borrar');
    if (!ok) return;
    try {
      await deleteMessage(message.id);
      setMessages((list) => list?.filter((m) => m.id !== message.id));
    } catch (error) {
      showAlert('No se pudo borrar', error instanceof Error ? error.message : String(error));
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
      <Pressable
        style={[styles.messageRow, isMine && styles.messageRowMine]}
        onLongPress={isMine ? () => setActionsFor(item) : undefined}
        delayLongPress={350}>
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

          const editedTag = item.edited_at ? (
            <Text style={styles.editedTag}>editado</Text>
          ) : null;

          if (item.kind === 'roll') {
            const roll = parseRoll(item.media_url);
            if (roll) {
              return (
                <RollBubble
                  roll={roll}
                  senderAlias={isMine ? null : item.profiles?.alias ?? 'Jugador/a'}
                />
              );
            }
          }

          if (isMine) {
            return media ? (
              <View style={styles.mediaWrap}>{media}</View>
            ) : (
              <View style={[styles.bubble, styles.bubbleMine]}>
                <Text style={styles.bubbleTextMine}>{item.body}</Text>
                {editedTag}
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
              {editedTag}
            </View>
          );
        })()}
      </Pressable>
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

        {session &&
          id &&
          iAmMember &&
          activePolls.map((poll) => (
            <ChatPollBanner
              key={poll.id}
              groupId={id}
              poll={poll}
              viewerId={session.user.id}
              onChanged={(next) =>
                setActivePolls((list) => list.map((p) => (p.id === next.id ? next : p)))
              }
            />
          ))}

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
            {typingAlias && (
              <Text style={styles.typingText}>✍️ {typingAlias} está escribiendo…</Text>
            )}
            {editing && (
              <View style={styles.editingBanner}>
                <Text style={styles.editingLabel} numberOfLines={1}>
                  ✏️ Editando mensaje
                </Text>
                <Pressable
                  onPress={() => {
                    setEditing(null);
                    setDraft('');
                  }}
                  accessibilityLabel="Cancelar edición">
                  <Text style={styles.editingCancel}>✕</Text>
                </Pressable>
              </View>
            )}
            {pickerTab !== null && pickerTab !== 'dice' && (
              <ChatMediaPickers
                tab={pickerTab}
                onEmoji={(e) => setDraft((d) => d + e)}
                onSticker={(s) => handleSendMedia('sticker', { body: s })}
                onGif={(url) => handleSendMedia('gif', { mediaUrl: url })}
              />
            )}
            {pickerTab === 'dice' && <DiceRoller onRoll={handleSendRoll} busy={sending} />}
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
              <Pressable
                style={[styles.tabButton, pickerTab === 'dice' && styles.tabActive]}
                onPress={() => setPickerTab(pickerTab === 'dice' ? null : 'dice')}
                accessibilityLabel="Tirar dados">
                <Text style={styles.tabGlyph}>🎲</Text>
              </Pressable>
            </View>
            <View style={styles.composerRow}>
              <TextInput
                style={[styles.input, styles.composerInput]}
                value={draft}
                onChangeText={handleDraftChange}
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

      <MessageActions
        visible={actionsFor !== null}
        canEdit={actionsFor?.kind === 'text'}
        onEdit={() => {
          if (!actionsFor) return;
          setEditing(actionsFor);
          setDraft(actionsFor.body ?? '');
          setActionsFor(null);
        }}
        onDelete={() => actionsFor && handleDeleteMessage(actionsFor)}
        onClose={() => setActionsFor(null)}
      />

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
  editedTag: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontFamily: RolderFonts.regular,
    alignSelf: 'flex-end',
  },
  typingText: {
    color: Rolder.textSecondary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    fontStyle: 'italic',
    paddingTop: 4,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(139,108,255,0.15)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: Spacing.one,
  },
  editingLabel: {
    color: Rolder.violetSofter,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
    flexShrink: 1,
  },
  editingCancel: {
    color: Rolder.textSecondary,
    fontSize: 14,
    paddingHorizontal: 6,
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
