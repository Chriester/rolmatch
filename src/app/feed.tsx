import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { showAlert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchPlayerFeed, type GroupCandidate } from '@/lib/feed';
import { FORMAT_LABELS, SLOT_LABELS, VTT_LABELS, WEEKDAY_LABELS } from '@/lib/groups';
import { blockUser } from '@/lib/moderation';
import { swipeOnGroup } from '@/lib/swipes';

export default function FeedScreen() {
  const session = useSession();
  const [candidates, setCandidates] = useState<GroupCandidate[] | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchPlayerFeed(session.user.id)
      .then(setCandidates)
      .catch(() => setCandidates([]));
  }, [session]);

  const current = candidates?.[index];

  const handleBlock = async () => {
    if (!session || !current) return;
    setBusy(true);
    try {
      const ownerId = current.group.owner_id;
      await blockUser(session.user.id, ownerId);
      setCandidates((list) => list?.filter((c) => c.group.owner_id !== ownerId));
      showAlert('Bloqueado', 'No volverás a ver mesas de esta persona, ni ella a ti.');
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSwipe = async (direction: 'like' | 'pass') => {
    if (!session || !current) return;
    setBusy(true);
    try {
      const matched = await swipeOnGroup(session.user.id, current.group.id, direction);
      if (matched) {
        showAlert(
          '🎲 ¡Match!',
          `A "${current.group.name}" también le interesas. La creación del canal de Discord llega en la fase del bot.`
        );
      }
      setIndex((i) => i + 1);
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <ThemedText type="link">← Volver</ThemedText>
        </Pressable>
        <ThemedText type="title">Mesas para ti</ThemedText>

        {candidates === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : !current ? (
          <ThemedText style={styles.empty}>
            No hay más mesas compatibles por ahora. Vuelve más tarde, o ajusta tu
            disponibilidad y sistemas en tu perfil.
          </ThemedText>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle">{current.group.name}</ThemedText>
              <View style={styles.scoreBadge}>
                <ThemedText type="smallBold" style={styles.scoreLabel}>
                  {current.result.score}%
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small">
              {current.group.systems?.name ?? 'Sistema sin definir'} ·{' '}
              {FORMAT_LABELS[current.group.format]}
              {current.group.frequency ? ` · ${current.group.frequency.toLowerCase()}` : ''}
            </ThemedText>
            {current.group.session_weekday !== null && current.group.session_slot !== null && (
              <ThemedText type="small">
                {WEEKDAY_LABELS[current.group.session_weekday]} ·{' '}
                {SLOT_LABELS[current.group.session_slot]} ({current.group.timezone}) ·{' '}
                {VTT_LABELS[current.group.vtt]}
              </ThemedText>
            )}
            {current.group.description && (
              <ScrollView style={styles.description}>
                <ThemedText>{current.group.description}</ThemedText>
              </ScrollView>
            )}
            <ThemedText type="small">
              Coincidís {current.result.overlapHours} h en horario
            </ThemedText>

            <View style={styles.actions}>
              <Pressable
                style={[styles.passButton, busy && styles.disabled]}
                onPress={() => handleSwipe('pass')}
                disabled={busy}>
                <ThemedText>Pasar</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.likeButton, busy && styles.disabled]}
                onPress={() => handleSwipe('like')}
                disabled={busy}>
                <ThemedText style={styles.likeLabel}>Me interesa</ThemedText>
              </Pressable>
            </View>

            <View style={styles.moderationRow}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/report',
                    params: { kind: 'group', id: current.group.id, name: current.group.name },
                  })
                }>
                <ThemedText type="small" style={styles.moderationLink}>
                  Reportar mesa
                </ThemedText>
              </Pressable>
              <Pressable onPress={handleBlock} disabled={busy}>
                <ThemedText type="small" style={styles.moderationLink}>
                  Bloquear al GM
                </ThemedText>
              </Pressable>
            </View>
          </View>
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
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scoreBadge: {
    backgroundColor: '#5865F2',
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  scoreLabel: {
    color: '#fff',
  },
  description: {
    maxHeight: 140,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  passButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  likeButton: {
    flex: 1,
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  likeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  moderationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  moderationLink: {
    color: '#d9534f',
  },
  disabled: {
    opacity: 0.5,
  },
});
