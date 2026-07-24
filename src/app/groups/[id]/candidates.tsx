import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchGroupCandidates, type PlayerCandidate } from '@/lib/feed';
import { groupSwipeOnUser } from '@/lib/swipes';

const ROLE_LABELS: Record<string, string> = {
  player: 'Jugador/a',
  gm: 'GM',
  both: 'Jugador/a y GM',
};

export default function GroupCandidatesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [candidates, setCandidates] = useState<PlayerCandidate[] | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchGroupCandidates(id)
      .then(setCandidates)
      .catch(() => setCandidates([]));
  }, [id]);

  const current = candidates?.[index];

  const handleSwipe = async (direction: 'like' | 'pass') => {
    if (!id || !current) return;
    setBusy(true);
    try {
      const matched = await groupSwipeOnUser(id, current.player.id, direction);
      if (matched) {
        Alert.alert(
          '🎲 ¡Match!',
          `${current.player.alias} también quiere jugar en vuestra mesa. La creación del canal de Discord llega en la fase del bot.`
        );
      }
      setIndex((i) => i + 1);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="link">← Volver a la mesa</ThemedText>
        </Pressable>
        <ThemedText type="title">Candidatos</ThemedText>

        {candidates === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : !current ? (
          <ThemedText style={styles.empty}>
            No hay más candidatos compatibles por ahora. Los jugadores nuevos que
            encajen con vuestro horario y sistema irán apareciendo aquí.
          </ThemedText>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="subtitle">{current.player.alias}</ThemedText>
              <View style={styles.scoreBadge}>
                <ThemedText type="smallBold" style={styles.scoreLabel}>
                  {current.result.score}%
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small">
              {ROLE_LABELS[current.player.role] ?? current.player.role} ·{' '}
              {current.player.timezone}
            </ThemedText>
            {current.player.bio && <ThemedText>{current.player.bio}</ThemedText>}
            <ThemedText type="small">
              Coincide {current.result.overlapHours} h con vuestra sesión
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
                <ThemedText style={styles.likeLabel}>Nos interesa</ThemedText>
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
  disabled: {
    opacity: 0.5,
  },
});
