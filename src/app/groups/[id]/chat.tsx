// Chat de texto por mesa, en tiempo real via Supabase Realtime — primer uso
// de postgres_changes en el proyecto. Discord deja de ser obligatorio: esta
// pantalla es el canal principal para hablar sin salir de la app.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
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
  fetchLastRead,
  fetchMessages,
  fetchMessageReactions,
  sendImageMessage,
  sendMediaMessage,
  sendMessage,
  sendRollMessage,
  markChatRead,
  subscribeToMessages,
  subscribeToReactions,
  toggleMessageReaction,
  unsubscribeFromMessages,
  type ChatMessage,
  type ReactionEvent,
  type ReactionSummary,
} from '@/lib/messages';
import { pickAndUploadImage } from '@/lib/images';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const [reactions, setReactions] = useState<Map<string, ReactionSummary[]>>(new Map());
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const groupRef = useRef<GroupDetail | null | undefined>(undefined);
  const listRef = useRef<FlatList<ChatMessage>>(null);
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
    // la última lectura se consulta ANTES de marcar como leído: de ahí sale
    // el separador «— nuevos —»
    const lastReadPromise = session
      ? fetchLastRead(id, session.user.id)
      : Promise.resolve(null);
    fetchMessages(id)
      .then(async (list) => {
        cacheSet(`group-msgs:${id}`, list);
        setMessages(list);
        setHasMore(list.length >= 100);
        if (session) {
          fetchMessageReactions(list.map((m) => m.id), session.user.id).then(setReactions);
          const lastRead = await lastReadPromise;
          const unread = list.filter(
            (m) =>
              m.sender_id !== session.user.id && (!lastRead || m.created_at > lastRead)
          );
          setFirstUnreadId(unread.length > 0 ? unread[unread.length - 1].id : null);
          markChatRead(id, session.user.id);
        }
      })
      .catch(() => {
        const cached = cacheGet<ChatMessage[]>(`group-msgs:${id}`);
        if (!cached) showAlert('No se pudo cargar el chat', 'Vuelve a entrar en unos segundos.');
        setMessages((current) => current ?? cached ?? []);
      });
  }, [id, session]);

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

  // Reacciones en vivo: deltas de otros (las mías van optimistas)
  useEffect(() => {
    if (!id || !session) return;
    const myId = session.user.id;
    const apply = (event: ReactionEvent, delta: 1 | -1) => {
      if (event.user_id === myId) return;
      setReactions((map) => {
        const next = new Map(map);
        const list = [...(next.get(event.message_id) ?? [])];
        const idx = list.findIndex((r) => r.emoji === event.emoji);
        if (delta === 1) {
          if (idx >= 0) list[idx] = { ...list[idx], count: list[idx].count + 1 };
          else list.push({ emoji: event.emoji, count: 1, mine: false });
        } else if (idx >= 0) {
          const count = list[idx].count - 1;
          if (count <= 0 && !list[idx].mine) list.splice(idx, 1);
          else list[idx] = { ...list[idx], count: Math.max(count, 1) };
        }
        next.set(event.message_id, list);
        return next;
      });
    };
    const channel = subscribeToReactions(`group:${id}`, {
      onAdd: (e) => apply(e, 1),
      onRemove: (e) => apply(e, -1),
    });
    return () => unsubscribeFromMessages(channel);
  }, [id, session]);

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    if (!session) return;
    const current = reactions.get(message.id) ?? [];
    const mine = current.find((r) => r.emoji === emoji)?.mine ?? false;
    // pintado optimista
    setReactions((map) => {
      const next = new Map(map);
      const list = [...(next.get(message.id) ?? [])];
      const idx = list.findIndex((r) => r.emoji === emoji);
      if (!mine) {
        if (idx >= 0) list[idx] = { ...list[idx], count: list[idx].count + 1, mine: true };
        else list.push({ emoji, count: 1, mine: true });
      } else if (idx >= 0) {
        const count = list[idx].count - 1;
        if (count <= 0) list.splice(idx, 1);
        else list[idx] = { ...list[idx], count, mine: false };
      }
      next.set(message.id, list);
      return next;
    });
    try {
      await toggleMessageReaction(message.id, session.user.id, emoji, !mine);
    } catch {
      fetchMessageReactions([message.id], session.user.id).then((fresh) =>
        setReactions((map) => {
          const next = new Map(map);
          next.set(message.id, fresh.get(message.id) ?? []);
          return next;
        })
      );
    }
  };

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

  // El "final" de un FlatList invertido es la parte de ARRIBA: al llegar,
  // se traen los mensajes anteriores al más viejo cargado.
  const handleLoadOlder = async () => {
    if (!id || loadingMore || !hasMore || !messages || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[messages.length - 1];
      const older = await fetchMessages(id, 50, oldest.created_at);
      if (older.length < 50) setHasMore(false);
      setMessages((list) => [
        ...(list ?? []),
        ...older.filter((o) => !list?.some((m) => m.id === o.id)),
      ]);
      if (session && older.length > 0) {
        const olderReactions = await fetchMessageReactions(
          older.map((m) => m.id),
          session.user.id
        );
        setReactions((map) => new Map([...map, ...olderReactions]));
      }
    } catch {
      // sin red: se reintenta al volver a llegar arriba
    } finally {
      setLoadingMore(false);
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

  const handleSendPhoto = async () => {
    if (!id || !session || sending) return;
    try {
      const url = await pickAndUploadImage(session.user.id, 'chat', [4, 3], {
        allowsEditing: false,
      });
      if (!url) return; // cancelado
      setSending(true);
      await sendImageMessage(id, session.user.id, url);
    } catch (error) {
      showAlert('No se pudo enviar la foto', error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  };

  const handleCopyMessage = async (message: ChatMessage) => {
    setActionsFor(null);
    const text = message.body ?? '';
    if (!text) return;
    if (Platform.OS === 'web') {
      await (navigator as { clipboard?: { writeText: (t: string) => Promise<void> } }).clipboard
        ?.writeText(text)
        .catch(() => {});
      showAlert('📋 Copiado', 'El mensaje está en tu portapapeles.');
    } else {
      // sin dependencia nativa de portapapeles: el share sheet incluye copiar
      await Share.share({ message: text }).catch(() => {});
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
    const itemReactions = reactions.get(item.id) ?? [];
    return (
      <>
      {item.id === firstUnreadId && (
        <View style={styles.newSeparator}>
          <View style={styles.newLine} />
          <Text style={styles.newLabel}>nuevos</Text>
          <View style={styles.newLine} />
        </View>
      )}
      <Pressable
        style={[styles.messageRow, isMine && styles.messageRowMine]}
        onLongPress={() => setActionsFor(item)}
        delayLongPress={350}>
        <View style={[styles.messageCol, isMine && styles.messageColMine]}>
        {(() => {
          const media =
            item.kind === 'image' && item.media_url ? (
              <Pressable onPress={() => setViewingImage(item.media_url)}>
                <Image
                  source={{ uri: item.media_url }}
                  style={styles.photoMessage}
                  contentFit="cover"
                />
              </Pressable>
            ) : item.kind === 'gif' && item.media_url ? (
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
        {itemReactions.length > 0 && (
          <View style={styles.reactionChips}>
            {itemReactions.map((r) => (
              <Pressable
                key={r.emoji}
                style={[styles.reactionChip, r.mine && styles.reactionChipMine]}
                onPress={() => handleToggleReaction(item, r.emoji)}>
                <Text style={styles.reactionChipLabel}>
                  {r.emoji}
                  {r.count > 1 ? ` ${r.count}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        </View>
      </Pressable>
      </>
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
              ref={listRef}
              style={styles.list}
              data={messages}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.listContent}
              renderItem={renderItem}
              onEndReached={handleLoadOlder}
              onEndReachedThreshold={0.3}
              onScroll={(e) => setShowJump(e.nativeEvent.contentOffset.y > 600)}
              scrollEventThrottle={120}
              ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
              ListEmptyComponent={
                <View style={styles.centerBox}>
                  <ThemedText style={styles.centerText}>
                    Sin mensajes todavía. Sé el primero en escribir.
                  </ThemedText>
                </View>
              }
            />
            {showJump && (
              <Pressable
                style={styles.jumpFab}
                accessibilityLabel="Bajar al último mensaje"
                onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}>
                <Text style={styles.jumpFabIcon}>⬇</Text>
              </Pressable>
            )}
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
              <Pressable
                style={styles.tabButton}
                onPress={handleSendPhoto}
                disabled={sending}
                accessibilityLabel="Enviar foto">
                <Text style={styles.tabGlyph}>📷</Text>
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
        canCopy={actionsFor?.kind === 'text' || actionsFor?.kind === 'roll'}
        canEdit={actionsFor?.kind === 'text' && actionsFor?.sender_id === session?.user.id}
        canDelete={actionsFor?.sender_id === session?.user.id}
        onReact={(emoji) => {
          if (actionsFor) handleToggleReaction(actionsFor, emoji);
          setActionsFor(null);
        }}
        onCopy={() => actionsFor && handleCopyMessage(actionsFor)}
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

      {/* visor de foto a pantalla completa */}
      <Modal
        transparent
        visible={viewingImage !== null}
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewingImage(null)}>
          {viewingImage && (
            <Image source={{ uri: viewingImage }} style={styles.viewerImage} contentFit="contain" />
          )}
        </Pressable>
      </Modal>
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
  messageCol: {
    maxWidth: '85%',
    alignItems: 'flex-start',
    gap: 3,
  },
  messageColMine: {
    alignItems: 'flex-end',
  },
  reactionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reactionChipMine: {
    backgroundColor: 'rgba(139,108,255,0.2)',
    borderColor: 'rgba(139,108,255,0.7)',
  },
  reactionChipLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
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
  jumpFab: {
    position: 'absolute',
    right: 6,
    bottom: 120,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(139,108,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  jumpFabIcon: {
    color: '#fff',
    fontSize: 17,
  },
  newSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  newLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(139,108,255,0.4)',
  },
  newLabel: {
    color: Rolder.violetSoft,
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  photoMessage: {
    width: 220,
    height: 165,
    borderRadius: 14,
    backgroundColor: Rolder.surface,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '85%',
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
