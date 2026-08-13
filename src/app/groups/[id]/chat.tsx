// Chat de texto por mesa, en tiempo real via Supabase Realtime — primer uso
// de postgres_changes en el proyecto. Discord deja de ser obligatorio: esta
// pantalla es el canal principal para hablar sin salir de la app.

import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
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
import {
  ArrowDown,
  Camera,
  Dices,
  FaceSlightlySmiling,
  Plus,
  SendHorizontal,
  Sticker,
  X,
} from 'lucide-react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Image } from 'expo-image';

import { confirmAction, humanizeError, showAlert } from '@/lib/alert';
import { ChatImage } from '@/components/chat-image';
import { ChatInfoPanel } from '@/components/chat-info-panel';
import { ChatPollBanner } from '@/components/chat-poll-banner';
import { DiceRoller } from '@/components/dice-roller';
import { MessageActions } from '@/components/message-actions';
import { Reveal } from '@/components/reveal';
import { RollBubble } from '@/components/roll-bubble';
import { parseRoll, type DiceRoll } from '@/lib/dice';
import { fetchPolls, subscribeToPolls, unsubscribeFromPolls, type SessionPoll } from '@/lib/polls';
import {
  ChatMediaPickers,
  gifSearchAvailable,
  type PickerTab,
} from '@/components/chat-media-pickers';
import { ThemedText } from '@/components/themed-text';
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
  messagePreview,
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

// La ruta vive solo para los deep links y push antiguos: el chat es una
// pestaña del hub de mesa (una única página), no una pantalla.
export default function GroupChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/groups/[id]', params: { id: id!, tab: 'chat' } }} />;
}

/** El chat embebido en el hub: sin cabecera propia, ocupa el hueco del panel. */
export function GroupChatPanel({ id }: { id: string }) {
  const session = useSession();
  // Los efectos dependen del id, NO del objeto session: supabase-js emite una
  // sesión nueva en cada refresco de token (y al volver a la pestaña en web),
  // y eso rehacía suscripciones y refetcheaba el historial sin motivo.
  const userId = session?.user.id ?? null;
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
  /** ＋ abierto: enseña emoji/sticker/gif/foto (el 🎲 va siempre a la vista) */
  const [attachOpen, setAttachOpen] = useState(false);
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
    const lastReadPromise = userId ? fetchLastRead(id, userId) : Promise.resolve(null);
    fetchMessages(id)
      .then(async (list) => {
        cacheSet(`group-msgs:${id}`, list);
        setMessages(list);
        setHasMore(list.length >= 100);
        if (userId) {
          fetchMessageReactions(list.map((m) => m.id), userId).then(setReactions);
          const lastRead = await lastReadPromise;
          const unread = list.filter(
            (m) => m.sender_id !== userId && (!lastRead || m.created_at > lastRead)
          );
          setFirstUnreadId(unread.length > 0 ? unread[unread.length - 1].id : null);
          markChatRead(id, userId);
        }
      })
      .catch(() => {
        const cached = cacheGet<ChatMessage[]>(`group-msgs:${id}`);
        if (!cached) showAlert('No se pudo cargar el chat', 'Vuelve a entrar en unos segundos.');
        setMessages((current) => current ?? cached ?? []);
      });
  }, [id, userId]);

  // Votaciones abiertas → un banner desplegable por cada una. Realtime
  // mantiene la lista viva (crear/cerrar/votar) y al volver del fondo
  // refrescamos por si se perdieron eventos con la app dormida.
  useEffect(() => {
    if (!id || !userId) return;
    const refresh = () =>
      fetchPolls(id, userId)
        .then((polls) => setActivePolls(polls.filter((p) => p.status === 'open')))
        .catch(() => {});
    refresh();
    const channel = subscribeToPolls(id, refresh);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      unsubscribeFromPolls(channel);
      appState.remove();
    };
  }, [id, userId]);

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
        if (userId) markChatRead(id, userId);
      },
      onUpdate: (row) =>
        setMessages((list) =>
          list?.map((m) => (m.id === row.id ? { ...m, ...row, profiles: m.profiles } : m))
        ),
      onDelete: (deletedId) =>
        setMessages((list) => list?.filter((m) => m.id !== deletedId)),
    });
    return () => unsubscribeFromMessages(channel);
  }, [id, userId]);

  // Reacciones en vivo: deltas de otros (las mías van optimistas)
  useEffect(() => {
    if (!id || !userId) return;
    const apply = (event: ReactionEvent, delta: 1 | -1) => {
      if (event.user_id === userId) return;
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
    const reactions = subscribeToReactions(id, {
      onAdd: (e) => apply(e, 1),
      onRemove: (e) => apply(e, -1),
    });
    return () => reactions.close();
  }, [id, userId]);

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
    if (!id || !userId) return;
    const handle = joinTypingChannel(`group:${id}`, userId, (alias) => {
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
  }, [id, userId]);

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
      showAlert('No se pudo enviar', humanizeError(error));
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
      showAlert('No se pudo tirar', humanizeError(error));
    } finally {
      setSending(false);
    }
  };

  const handleSendPhoto = async () => {
    if (!id || !session || sending) return;
    try {
      const url = await pickAndUploadImage(session.user.id, 'chat', [4, 3], {
        chatTarget: { kind: 'group', id },
        allowsEditing: false,
      });
      if (!url) return; // cancelado
      setSending(true);
      await sendImageMessage(id, session.user.id, url);
    } catch (error) {
      showAlert('No se pudo enviar la foto', humanizeError(error));
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
      showAlert('Copiado', 'El mensaje está en tu portapapeles.');
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
      showAlert('No se pudo borrar', humanizeError(error));
    }
  };

  const handleSendMedia = async (kind: 'gif' | 'sticker', content: { mediaUrl?: string; body?: string }) => {
    if (!id || !session || sending) return;
    setSending(true);
    setPickerTab(null);
    try {
      await sendMediaMessage(id, session.user.id, kind, content);
    } catch (error) {
      showAlert('No se pudo enviar', humanizeError(error));
    } finally {
      setSending(false);
    }
  };

  if (group === undefined || messages === undefined) {
    return (
      <View style={[styles.panel, styles.loading]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (group === null) {
    return (
      <View style={[styles.panel, styles.loading]}>
        <ThemedText>No se pudo cargar la mesa.</ThemedText>
      </View>
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
                <ChatImage mediaUrl={item.media_url} style={styles.photoMessage} />
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

          // la silla del GM brilla en oro (entregable 3b)
          const fromGm = item.sender_id === group.owner_id;
          const senderLabel = `${item.profiles?.alias ?? 'Jugador/a'}${fromGm ? ' · GM' : ''}`;

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
              <Text style={[styles.senderName, fromGm && styles.senderNameGm]}>{senderLabel}</Text>
              {media}
            </View>
          ) : (
            <View style={[styles.bubble, styles.bubbleTheirs]}>
              <Text style={[styles.senderName, fromGm && styles.senderNameGm]}>{senderLabel}</Text>
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

  // Panel embebido en el hub: sin ThemedView/SafeArea/cabecera propios —
  // la identidad de la mesa ya la pone el hero del hub encima.
  return (
    <View style={styles.panel}>
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
                <ArrowDown color="#fff" size={18} strokeWidth={2} />
              </Pressable>
            )}
            {typingAlias && (
              <Text style={styles.typingText}>{typingAlias} está escribiendo…</Text>
            )}
            {editing && (
              <View style={styles.editingBanner}>
                <Text style={styles.editingLabel} numberOfLines={1}>
                  Editando mensaje
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
              <Reveal switchKey={pickerTab} distance={8}>
                <ChatMediaPickers
                  tab={pickerTab}
                  onEmoji={(e) => setDraft((d) => d + e)}
                  onSticker={(s) => handleSendMedia('sticker', { body: s })}
                  onGif={(url) => handleSendMedia('gif', { mediaUrl: url })}
                />
              </Reveal>
            )}
            {pickerTab === 'dice' && (
              <Reveal distance={8}>
                <DiceRoller onRoll={handleSendRoll} busy={sending} />
              </Reveal>
            )}
            {/* Composer de DOS botones (3b): el dado siempre a la vista —
                es identidad de producto — y ＋ agrupa el resto. Cinco
                botones del mismo peso era ninguno importante. */}
            <View style={styles.pickerTabs}>
              <Pressable
                style={[styles.tabButton, attachOpen && styles.tabActive]}
                onPress={() => {
                  setAttachOpen((open) => !open);
                  if (attachOpen) setPickerTab((tab) => (tab === 'dice' ? tab : null));
                }}
                accessibilityLabel={attachOpen ? 'Cerrar adjuntos' : 'Adjuntar'}>
                {attachOpen ? (
                  <X color={Rolder.textSecondary} size={22} strokeWidth={2} />
                ) : (
                  <Plus color={Rolder.textSecondary} size={22} strokeWidth={2} />
                )}
              </Pressable>
              <Pressable
                style={[styles.tabButton, pickerTab === 'dice' && styles.tabActive]}
                onPress={() => setPickerTab(pickerTab === 'dice' ? null : 'dice')}
                accessibilityLabel="Tirar dados">
                <Dices color={Rolder.textSecondary} size={22} strokeWidth={2} />
              </Pressable>
              {attachOpen && (
                <Reveal distance={4} style={styles.attachReveal}>
                  <Pressable
                    style={[styles.tabButton, pickerTab === 'emoji' && styles.tabActive]}
                    onPress={() => setPickerTab(pickerTab === 'emoji' ? null : 'emoji')}
                    accessibilityLabel="Emojis">
                    <FaceSlightlySmiling color={Rolder.textSecondary} size={22} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    style={[styles.tabButton, pickerTab === 'sticker' && styles.tabActive]}
                    onPress={() => setPickerTab(pickerTab === 'sticker' ? null : 'sticker')}
                    accessibilityLabel="Stickers">
                    <Sticker color={Rolder.textSecondary} size={22} strokeWidth={2} />
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
                    style={styles.tabButton}
                    onPress={handleSendPhoto}
                    disabled={sending}
                    accessibilityLabel="Enviar foto">
                    <Camera color={Rolder.textSecondary} size={22} strokeWidth={2} />
                  </Pressable>
                </Reveal>
              )}
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
                  <SendHorizontal color="#fff" size={20} strokeWidth={2} />
                </LinearGradient>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

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
        onReport={
          actionsFor && actionsFor.sender_id !== userId
            ? () => {
                const message = actionsFor;
                setActionsFor(null);
                router.push({
                  pathname: '/report',
                  params: {
                    kind: 'message',
                    id: message.id,
                    authorId: message.sender_id,
                    name: message.profiles?.alias ?? '',
                    excerpt: messagePreview(message),
                  },
                });
              }
            : undefined
        }
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
            <ChatImage mediaUrl={viewingImage} style={styles.viewerImage} contentFit="contain" />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // el panel llena el hueco que le deja el hub (hero + pestañas arriba)
  panel: {
    flex: 1,
    width: '100%',
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
  // colgando del borde de la burbuja, no flotando debajo (3b)
  reactionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: -8,
    marginLeft: 10,
    zIndex: 1,
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
    backgroundColor: 'rgba(199,125,255,0.2)',
    borderColor: 'rgba(199,125,255,0.7)',
  },
  reactionChipLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  bubble: {
    // el tope de anchura vive en messageCol: un maxWidth % aquí se
    // resolvería contra un padre que encoge al contenido (en web parte
    // palabras en vertical)
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
  senderNameGm: {
    color: Rolder.gold,
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
    backgroundColor: 'rgba(199,125,255,0.15)',
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
    backgroundColor: 'rgba(199,125,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
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
    backgroundColor: 'rgba(199,125,255,0.4)',
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
  attachReveal: {
    flexDirection: 'row',
    gap: 6,
  },
  tabButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: {
    backgroundColor: 'rgba(199,125,255,0.3)',
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
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});
