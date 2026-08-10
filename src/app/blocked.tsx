// Gente que he bloqueado, con la vuelta atrás. Bloquear era hasta ahora un
// viaje de ida: se insertaba en blocks y no había forma de deshacerlo desde
// la app (la RLS sí lo permitía desde el principio).

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ListRow, ScreenBlurb, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { confirmAction, showAlert } from '@/lib/alert';
import { fetchMyBlocks, unblockUser, type BlockedProfile } from '@/lib/moderation';

export default function BlockedScreen() {
  const session = useSession();
  const userId = session?.user.id ?? null;
  const [blocked, setBlocked] = useState<BlockedProfile[] | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    fetchMyBlocks(userId)
      .then(setBlocked)
      .catch(() => setBlocked([]));
  }, [userId]);

  useEffect(load, [load]);

  const handleUnblock = async (person: BlockedProfile) => {
    if (!userId || busyId) return;
    const alias = person.alias ?? 'esta persona';
    const ok = await confirmAction(
      `¿Desbloquear a ${alias}?`,
      'Volveréis a veros en el feed y podrá escribirte.',
      'Sí, desbloquear'
    );
    if (!ok) return;
    setBusyId(person.id);
    // quitamos la fila ya: si falla, la devolvemos y avisamos
    setBlocked((list) => list?.filter((p) => p.id !== person.id));
    try {
      await unblockUser(userId, person.id);
    } catch (error) {
      setBlocked((list) => (list ? [person, ...list] : [person]));
      showAlert('No se pudo desbloquear', error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <AppHeader
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          />
          <ScreenTitle>🚫 Bloqueados</ScreenTitle>
          <ScreenBlurb>
            Ni os veis en el feed ni podéis escribiros. Solo aparece aquí la gente que has
            bloqueado tú.
          </ScreenBlurb>

          {blocked === undefined ? (
            <ActivityIndicator style={styles.loading} />
          ) : blocked.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🕊️</Text>
              <ThemedText type="small" style={styles.empty}>
                No has bloqueado a nadie.
              </ThemedText>
            </View>
          ) : (
            blocked.map((person) => (
              <ListRow key={person.id}>
                {person.avatar_url ? (
                  <Image source={{ uri: person.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarEmoji}>🧝</Text>
                  </View>
                )}
                <Text style={styles.alias} numberOfLines={1}>
                  {person.alias ?? 'Sin alias'}
                </Text>
                <Pressable
                  disabled={busyId === person.id}
                  accessibilityLabel={`Desbloquear a ${person.alias ?? 'esta persona'}`}
                  onPress={() => handleUnblock(person)}>
                  <Text style={styles.unblock}>Desbloquear</Text>
                </Pressable>
              </ListRow>
            ))
          )}
        </View>
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
  },
  content: {
    flex: 1,
    padding: 20,
    gap: Spacing.three,
  },
  loading: {
    marginTop: Spacing.four,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Rolder.surface,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  alias: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  unblock: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  emptyEmoji: {
    fontSize: 34,
  },
  empty: {
    textAlign: 'center',
  },
});
