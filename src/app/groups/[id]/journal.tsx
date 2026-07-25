// Historico de la mesa: jugadores comparten fotos y frases de la partida
// (ej. "Dia uno: no habran mas dias"), en orden cronologico. Reutiliza el
// bucket avatars via pickAndUploadImage (prefix 'journal').

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchGroup, type GroupDetail } from '@/lib/groups';
import { pickAndUploadImage } from '@/lib/images';
import {
  addJournalEntry,
  deleteJournalEntry,
  fetchJournalEntries,
  type JournalEntry,
} from '@/lib/journal';

function formatEntryDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GroupJournalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [group, setGroup] = useState<GroupDetail | null | undefined>(undefined);
  const [entries, setEntries] = useState<JournalEntry[] | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [posting, setPosting] = useState(false);

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
  }, [id]);

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
      setEntries((list) => [entry, ...(list ?? [])]);
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

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const isMine = item.author_id === session?.user.id;
    return (
      <View style={styles.card}>
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
            <Text style={styles.entryDate}>{formatEntryDate(item.created_at)}</Text>
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
          📖 {group.name}
        </Text>

        {!iAmMember ? (
          <View style={styles.centerBox}>
            <ThemedText style={styles.centerText}>No eres miembro de esta mesa.</ThemedText>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.listArea}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <FlatList
              style={styles.list}
              data={entries}
              keyExtractor={(e) => e.id}
              contentContainerStyle={styles.listContent}
              renderItem={renderItem}
              ListEmptyComponent={
                <View style={styles.centerBox}>
                  <ThemedText style={styles.centerText}>
                    Sin recuerdos todavia. Comparte el primero: una foto o una frase de la partida.
                  </ThemedText>
                </View>
              }
            />
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
                  const native = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
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
  listArea: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.three,
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
