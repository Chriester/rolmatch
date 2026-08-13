import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { CharacterForm } from '@/components/character-form';
import { CharacterSheetView } from '@/components/character-sheet-view';
import { PrimaryButton } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Rolder, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  characterMilestone,
  deleteCharacter,
  fetchCharacter,
  updateCharacter,
  type Character,
  type CharacterInput,
} from '@/lib/characters';
import { fetchPremiumStatus } from '@/lib/premium';
import { cacheGet, cacheSet } from '@/lib/screen-cache';
import { fetchXpTotals, levelFromXp } from '@/lib/xp';
import {
  deleteSheet,
  fetchSheet,
  pickAndUploadSheet,
  setSheetPublic,
  sheetSignedUrl,
  type CharacterSheet,
} from '@/lib/sheets';

export default function EditCharacterScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const session = useSession();
  // vista por defecto: la hoja; editar es una decisión explícita
  const [editing, setEditing] = useState(edit === '1');
  // arranca con lo último visto para no enseñar la rueda al volver a una
  // ficha ya visitada; el fetch de abajo refresca en silencio
  const [character, setCharacter] = useState<Character | null | undefined>(() =>
    id ? cacheGet(`character:${id}`) : undefined
  );
  const [sheet, setSheet] = useState<CharacterSheet | null | undefined>(() =>
    id ? cacheGet(`character-sheet:${id}`) : undefined
  );
  const [busy, setBusy] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [themeStatus, setThemeStatus] = useState({ isPremium: false, level: 1 });
  // Un personaje público puede verlo cualquiera; solo el dueño lo gestiona.
  const isOwner = character != null && session?.user.id === character.user_id;

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    Promise.all([
      fetchPremiumStatus(userId).catch(() => ({ active: false })),
      fetchXpTotals([userId]).catch(() => new Map<string, number>()),
    ]).then(([premium, xp]) =>
      setThemeStatus({ isPremium: premium.active, level: levelFromXp(xp.get(userId) ?? 0) })
    );
  }, [session]);

  useEffect(() => {
    if (!id) return;
    fetchCharacter(id)
      .then((c) => {
        cacheSet(`character:${id}`, c);
        setCharacter(c);
      })
      .catch(() => setCharacter((current) => current ?? null));
    fetchSheet(id)
      .then((s) => {
        cacheSet(`character-sheet:${id}`, s);
        setSheet(s);
      })
      .catch(() => setSheet((current) => current ?? null));
  }, [id]);

  const handleUploadSheet = async () => {
    if (!id || !session) return;
    setSheetBusy(true);
    try {
      const uploaded = await pickAndUploadSheet(session.user.id, id);
      if (uploaded) setSheet(uploaded);
    } catch (error) {
      showAlert('No se pudo subir la hoja', error instanceof Error ? error.message : String(error));
    } finally {
      setSheetBusy(false);
    }
  };

  const handleViewSheet = async () => {
    if (!sheet) return;
    try {
      Linking.openURL(await sheetSignedUrl(sheet));
    } catch (error) {
      showAlert('No se pudo abrir la hoja', error instanceof Error ? error.message : String(error));
    }
  };

  const handleRemoveSheet = async () => {
    if (!sheet) return;
    setSheetBusy(true);
    try {
      await deleteSheet(sheet);
      setSheet(null);
    } catch (error) {
      showAlert('No se pudo quitar la hoja', error instanceof Error ? error.message : String(error));
    } finally {
      setSheetBusy(false);
    }
  };

  const handleSave = async (input: CharacterInput) => {
    if (!id) return;
    setBusy(true);
    try {
      await updateCharacter(id, input);
      router.replace('/characters');
    } catch (error) {
      showAlert('No se pudo guardar', error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    // confirm() solo existe en web; en nativo bastará el flujo de borrado normal
    if (Platform.OS === 'web' && !window.confirm('¿Borrar este personaje? No se puede deshacer.')) {
      return;
    }
    setBusy(true);
    try {
      await deleteCharacter(id);
      router.replace('/characters');
    } catch (error) {
      showAlert('No se pudo borrar', error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          onBack={() =>
            editing
              ? setEditing(false)
              : router.canGoBack()
                ? router.back()
                // un visitante sin historial no tiene nada que ver en /characters
                : router.replace(isOwner ? '/characters' : '/')
          }
          right={
            isOwner ? (
              <Pressable onPress={handleDelete} disabled={busy}>
                <ThemedText type="small" style={styles.deleteLabel}>
                  Borrar
                </ThemedText>
              </Pressable>
            ) : undefined
          }
        />

        {character === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : character === null ? (
          <ThemedText style={styles.empty}>No se pudo cargar el personaje.</ThemedText>
        ) : editing && isOwner ? (
          <>
            <ThemedText type="title">{character.name}</ThemedText>
            {session && (
              <CharacterForm
                userId={session.user.id}
                initial={character}
                busy={busy}
                submitLabel="Guardar cambios"
                onSubmit={handleSave}
                themeStatus={themeStatus}
              />
            )}
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.viewScroll}>
            <View style={styles.hero}>
              {character.portrait_url ? (
                <Image source={{ uri: character.portrait_url }} style={styles.portrait} />
              ) : (
                <View style={[styles.portrait, styles.portraitFallback]}>
                  <Text style={styles.portraitEmoji}>🧝</Text>
                </View>
              )}
              <ThemedText type="title">{character.name}</ThemedText>
              {(character.sessions_lived > 0 || characterMilestone(character.sessions_lived)) && (
                <ThemedText type="small" style={styles.lifeLine}>
                  {[
                    character.sessions_lived > 0
                      ? `🕯️ ${character.sessions_lived} ${
                          character.sessions_lived === 1 ? 'sesión vivida' : 'sesiones vividas'
                        }`
                      : null,
                    characterMilestone(character.sessions_lived),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </ThemedText>
              )}
            </View>

            <CharacterSheetView character={character} />

            {isOwner && (
              <PrimaryButton label="✏️ Editar personaje" onPress={() => setEditing(true)} />
            )}

            {isOwner ? (
              <View style={styles.sheetBox}>
                <ThemedText type="subtitle">Hoja en PDF / imagen</ThemedText>
                {sheetBusy ? (
                  <ActivityIndicator />
                ) : sheet ? (
                  <View style={styles.sheetActions}>
                    <Pressable style={styles.sheetButton} onPress={handleViewSheet}>
                      <ThemedText type="small">📄 Ver hoja</ThemedText>
                    </Pressable>
                    <Pressable style={styles.sheetButton} onPress={handleUploadSheet}>
                      <ThemedText type="small">Reemplazar</ThemedText>
                    </Pressable>
                    <Pressable style={styles.sheetButton} onPress={handleRemoveSheet}>
                      <ThemedText type="small" style={styles.sheetRemove}>
                        Quitar
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.sheetButton} onPress={handleUploadSheet}>
                    <ThemedText type="small">⬆️ Subir hoja (PDF o imagen, máx. 5 MB)</ThemedText>
                  </Pressable>
                )}
                {sheet && (
                  <View style={styles.sheetVisibilityRow}>
                    <ThemedText type="small">
                      Hoja pública (visible para otros usuarios)
                    </ThemedText>
                    <Switch
                      value={sheet.is_public}
                      onValueChange={async (value) => {
                        try {
                          await setSheetPublic(sheet.id, value);
                          setSheet({ ...sheet, is_public: value });
                        } catch (error) {
                          showAlert(
                            'No se pudo cambiar la visibilidad',
                            error instanceof Error ? error.message : String(error)
                          );
                        }
                      }}
                    />
                  </View>
                )}
              </View>
            ) : (
              sheet && (
                <View style={styles.sheetBox}>
                  <ThemedText type="subtitle">Hoja en PDF / imagen</ThemedText>
                  <Pressable style={styles.sheetButton} onPress={handleViewSheet}>
                    <ThemedText type="small">📄 Ver hoja</ThemedText>
                  </Pressable>
                </View>
              )
            )}
          </ScrollView>
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
  lifeLine: {
    color: Rolder.gold,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteLabel: {
    color: '#d9534f',
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  sheetBox: {
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  sheetActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  sheetButton: {
    paddingVertical: Spacing.one,
  },
  sheetRemove: {
    color: '#d9534f',
  },
  sheetVisibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  viewScroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  portrait: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  portraitFallback: {
    backgroundColor: 'rgba(229,72,77,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: {
    fontSize: 52,
  },
});
