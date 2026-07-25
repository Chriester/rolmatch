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

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchGroup, type GroupDetail } from '@/lib/groups';
import {
  fetchMessages,
  sendMessage,
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
    });
    return () => unsubscribeFromMessages(channel);
  }, [id]);

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
        {isMine ? (
          <View style={[styles.bubble, styles.bubbleMine]}>
            <Text style={styles.bubbleTextMine}>{item.body}</Text>
          </View>
        ) : (
          <View style={[styles.bubble, styles.bubbleTheirs]}>
            <Text style={styles.senderName}>{item.profiles?.alias ?? 'Jugador/a'}</Text>
            <Text style={styles.bubbleText}>{item.body}</Text>
          </View>
        )}
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
        <Text numberOfLines={1} style={styles.subheader}>
          💬 {group.name}
        </Text>

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
            <View style={styles.composerRow}>
              <TextInput
                style={[styles.input, styles.composerInput]}
                value={draft}
                onChangeText={setDraft}
                placeholder="Escribe un mensaje…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                multiline
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
  subheader: {
    color: '#fff',
    fontSize: 16,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    marginBottom: Spacing.two,
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
