// Historico de la mesa: se lee siempre, pero solo se escribe el dia de la
// partida (hay una fila en `sessions` cuya fecha, en la timezone de la
// mesa, es hoy — lo decide el servidor, ver migr. 00028). Al abrirlo ese
// dia se crea el mensaje de sistema "Partida del <dia>" y todo lo que se
// publique queda encuadernado bajo ese capitulo.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { showAlert } from '@/lib/alert';
import { InlineBanner } from '@/components/inline-banner';
import { ThemedText } from '@/components/themed-text';
import { OutlineButton } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchGroup, type GroupDetail } from '@/lib/groups';
import { pickAndUploadImage } from '@/lib/images';
import {
  addJournalEntry,
  deleteJournalEntry,
  ensureTodayHeader,
  fetchJournalEntries,
  groupJournalEntries,
  type JournalEntry,
} from '@/lib/journal';
import { fetchTodaySession, formatSessionDay, type GameSession } from '@/lib/sessions';

function formatEntryTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// La ruta vive solo para deep links: el diario es una pestaña del hub.
export default function GroupJournalRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/groups/[id]', params: { id: id!, tab: 'diario' } }} />;
}

/** El diario embebido en el hub: sin cabecera propia. */
export function GroupJournalPanel({
  id,
  onGoAgenda,
}: {
  id: string;
  /** cambiar a la pestaña Agenda sin navegar (lo pone el hub) */
  onGoAgenda?: () => void;
}) {
  const session = useSession();
  const [group, setGroup] = useState<GroupDetail | null | undefined>(undefined);
  const [entries, setEntries] = useState<JournalEntry[] | undefined>(undefined);
  const [todaySession, setTodaySession] = useState<GameSession | null | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [posting, setPosting] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string | null>>(new Set());

  const toggleChapter = (key: string | null) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!id) return;
    fetchGroup(id)
      .then(setGroup)
      .catch(() => setGroup(null));
    fetchJournalEntries(id)
      .then(setEntries)
      .catch(() => {
        setEntries([]);
        showAlert('No se pudo cargar el historico', 'Vuelve a entrar en unos segundos.');
      });
    fetchTodaySession(id)
      .then(setTodaySession)
      .catch(() => setTodaySession(null));
  }, [id]);

  // Crea el capitulo del dia la primera vez que alguien entra hoy.
  useEffect(() => {
    if (!id || !session || !todaySession || entries === undefined) return;
    const hasHeader = entries.some(
      (e) => e.is_system && e.session_id === todaySession.id
    );
    if (hasHeader) return;
    ensureTodayHeader(id, session.user.id, formatSessionDay(todaySession.starts_at))
      .then(() => fetchJournalEntries(id))
      .then(setEntries)
      .catch(() => {});
  }, [id, session, todaySession, entries]);

  const handlePickImage = async () => {
    if (!session) return;
    setPickingImage(true);
    try {
      const uploaded = await pickAndUploadImage(session.user.id, 'journal', [4, 3]);
      if (uploaded) setPendingImage(uploaded);
    } catch (error) {
      showAlert('No se pudo subir la imagen', error instanceof Error ? error.message : String(error));
    } finally {
      setPickingImage(false);
    }
  };

  const handlePost = async () => {
    if (!id || !session || posting) return;
    if (!draft.trim() && !pendingImage) return;
    setPosting(true);
    try {
      const entry = await addJournalEntry(id, session.user.id, draft, pendingImage);
      setEntries((list) => [...(list ?? []), entry]);
      setDraft('');
      setPendingImage(null);
    } catch (error) {
      showAlert('No se pudo publicar', error instanceof Error ? error.message : String(error));
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteJournalEntry(entryId);
      setEntries((list) => list?.filter((e) => e.id !== entryId));
    } catch (error) {
      showAlert('No se pudo borrar', error instanceof Error ? error.message : String(error));
    }
  };

  if (group === undefined || entries === undefined) {
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
  const chapters = groupJournalEntries(entries);

  const renderEntry = (item: JournalEntry) => {
    const isMine = item.author_id === session?.user.id;
    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          {item.profiles?.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={styles.authorAvatar} />
          ) : (
            <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
              <Text style={styles.authorEmoji}>🧝</Text>
            </View>
          )}
          <View style={styles.cardHeaderText}>
            <Text style={styles.authorName}>{item.profiles?.alias ?? 'Jugador/a'}</Text>
            <Text style={styles.entryDate}>{formatEntryTime(item.created_at)}</Text>
          </View>
          {isMine && (
            <Pressable
              accessibilityLabel="Borrar recuerdo"
              onPress={() => handleDelete(item.id)}
              hitSlop={8}>
              <Text style={styles.deleteIcon}>🗑</Text>
            </Pressable>
          )}
        </View>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.entryImage} contentFit="cover" />
        )}
        {item.body && <Text style={styles.entryBody}>{item.body}</Text>}
      </View>
    );
  };

  // Panel embebido: la identidad de la mesa la pone el hero del hub.
  return (
    <View style={styles.panel}>
        {/* Día de partida con la crónica en blanco: el empujón (3c) */}
        {iAmMember &&
          todaySession != null &&
          !entries.some((e) => e.session_id === todaySession.id && !e.is_system) && (
            <InlineBanner
              tone="green"
              title="✍️ Crónica de hoy"
              body="La página de esta partida está en blanco. Lo que no se escribe hoy, mañana se ha olvidado — una frase basta."
            />
          )}

        {!iAmMember ? (
          <View style={styles.centerBox}>
            <ThemedText style={styles.centerText}>No eres miembro de esta mesa.</ThemedText>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.listArea}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {chapters.length === 0 ? (
                <View style={styles.centerBox}>
                  <ThemedText style={styles.centerText}>
                    Sin recuerdos todavia. El dia de la partida se abre el histórico para
                    escribir.
                  </ThemedText>
                </View>
              ) : (
                chapters.map((chapter) => {
                  const isToday = todaySession != null && chapter.sessionId === todaySession.id;
                  const isOpen = isToday || expandedChapters.has(chapter.sessionId);
                  const count = chapter.entries.length;
                  return (
                    <View key={chapter.sessionId ?? 'sin-sesion'} style={styles.chapter}>
                      <Pressable
                        style={[styles.chapterHeader, isToday && styles.chapterHeaderToday]}
                        onPress={() => !isToday && count > 0 && toggleChapter(chapter.sessionId)}
                        disabled={isToday || count === 0}>
                        <Text style={styles.chapterHeaderLabel} numberOfLines={2}>
                          {chapter.header?.body ?? 'Recuerdos sueltos'}
                        </Text>
                        {!isToday && (
                          <Text style={styles.chapterToggleHint}>
                            {count === 0
                              ? 'sin recuerdos'
                              : isOpen
                                ? '▲ ocultar'
                                : `▼ ver ${count} ${count === 1 ? 'recuerdo' : 'recuerdos'}`}
                          </Text>
                        )}
                      </Pressable>
                      {isOpen && chapter.entries.map(renderEntry)}
                    </View>
                  );
                })
              )}
            </ScrollView>

            {todaySession ? (
              <>
                {pendingImage && (
                  <View style={styles.previewRow}>
                    <Image source={{ uri: pendingImage }} style={styles.previewThumb} />
                    <Pressable
                      style={styles.previewRemove}
                      onPress={() => setPendingImage(null)}
                      accessibilityLabel="Quitar imagen">
                      <Text style={styles.previewRemoveLabel}>✕</Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.composerRow}>
                  <Pressable
                    style={styles.attachButton}
                    onPress={handlePickImage}
                    disabled={pickingImage}
                    accessibilityLabel="Anadir foto">
                    {pickingImage ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Text style={styles.attachLabel}>📷</Text>
                    )}
                  </Pressable>
                  <TextInput
                    style={[styles.input, styles.composerInput]}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Escribe un recuerdo…"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    multiline
                    maxLength={500}
                    onKeyPress={(e) => {
                      if (Platform.OS !== 'web') return;
                      const native = e.nativeEvent as unknown as {
                        key: string;
                        shiftKey?: boolean;
                      };
                      if (native.key === 'Enter' && !native.shiftKey) {
                        e.preventDefault();
                        handlePost();
                      }
                    }}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      (posting || (!draft.trim() && !pendingImage)) && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                    onPress={handlePost}
                    disabled={posting || (!draft.trim() && !pendingImage)}>
                    <LinearGradient
                      colors={[Rolder.violet, Rolder.discord]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sendButton}>
                      <Text style={styles.sendLabel}>➤</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            ) : todaySession === null ? (
              <View style={styles.noEventBox}>
                <ThemedText type="small" style={styles.centerText}>
                  Hoy no hay partida programada — el histórico se abre para escribir el día de
                  la sesión.
                </ThemedText>
                <OutlineButton
                  label="📅 Ver calendario"
                  onPress={() =>
                    onGoAgenda
                      ? onGoAgenda()
                      : router.push({
                          pathname: '/groups/[id]/schedule',
                          params: { id: group.id },
                        })
                  }
                />
              </View>
            ) : null}
          </KeyboardAvoidingView>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  subheader: {
    color: '#fff',
    fontSize: 16,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  listArea: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.four,
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
  chapter: {
    gap: Spacing.two,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: 'rgba(139,108,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.4)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chapterHeaderToday: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingVertical: 6,
  },
  chapterHeaderLabel: {
    flexShrink: 1,
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  chapterToggleHint: {
    color: Rolder.textSecondary,
    fontSize: 11,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  authorAvatarFallback: {
    backgroundColor: 'rgba(139,108,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorEmoji: {
    fontSize: 14,
  },
  cardHeaderText: {
    flex: 1,
    gap: 1,
  },
  authorName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  entryDate: {
    color: Rolder.textSecondary,
    fontSize: 11,
    fontFamily: RolderFonts.regular,
  },
  deleteIcon: {
    fontSize: 15,
    opacity: 0.6,
  },
  entryImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  entryBody: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
    lineHeight: 20,
  },
  noEventBox: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  previewThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  previewRemove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRemoveLabel: {
    color: '#fff',
    fontSize: 12,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: {
    fontSize: 18,
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
