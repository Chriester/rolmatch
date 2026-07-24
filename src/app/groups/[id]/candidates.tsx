import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { ActionBar } from '@/components/swipe/action-bar';
import { CardShell, cardText } from '@/components/swipe/card-shell';
import { SwipeDeck, type SwipeChoice, type SwipeDeckHandle } from '@/components/swipe/deck';
import { DetailsSheet, sheetText } from '@/components/swipe/details-sheet';
import { MatchOverlay } from '@/components/swipe/match-overlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchGroupCandidates, type PlayerCandidate } from '@/lib/feed';
import { fetchGroup, type GroupDetail } from '@/lib/groups';
import { blockUser } from '@/lib/moderation';
import { groupSwipeOnUser } from '@/lib/swipes';

const DECK_MAX_WIDTH = 420;

const ROLE_LABELS: Record<string, string> = {
  player: 'Jugador/a',
  gm: 'GM',
  both: 'Jugador/a y GM',
};

export default function GroupCandidatesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const deckRef = useRef<SwipeDeckHandle | null>(null);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [candidates, setCandidates] = useState<PlayerCandidate[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [matchWith, setMatchWith] = useState<PlayerCandidate | null>(null);

  const load = useCallback(() => {
    if (!id || !session) return;
    setLoadError(false);
    setCandidates(undefined);
    setIndex(0);
    setShowDetails(false);
    fetchGroupCandidates(id, session.user.id)
      .then(setCandidates)
      .catch(() => setLoadError(true));
    fetchGroup(id)
      .then(setGroup)
      .catch(() => {});
  }, [id, session]);

  useFocusEffect(load);

  const current = candidates?.[index];

  const handleSwiped = (item: PlayerCandidate, choice: SwipeChoice) => {
    if (!id) return;
    setShowDetails(false);
    setIndex((i) => i + 1);
    groupSwipeOnUser(id, item.player.id, choice === 'like' ? 'like' : 'pass')
      .then((matched) => {
        if (matched) setMatchWith(item);
      })
      .catch((error) =>
        showAlert('No se pudo guardar el swipe', error instanceof Error ? error.message : String(error))
      );
  };

  const handleBlock = async () => {
    if (!session || !current) return;
    try {
      const blockedId = current.player.id;
      await blockUser(session.user.id, blockedId);
      setShowDetails(false);
      setCandidates((list) => list?.filter((c) => c.player.id !== blockedId));
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : String(error));
    }
  };

  const renderCard = (c: PlayerCandidate) => (
    <CardShell
      imageUrl={c.player.avatar_url}
      fallbackEmoji="🧙"
      topRight={
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{c.result.score}%</Text>
        </View>
      }
      banner={
        c.likedGroup ? (
          <View style={styles.likedBanner}>
            <Text style={styles.likedText} numberOfLines={1}>
              💘 Le gustáis
              {c.proposal ? ` — propone a ${c.proposal.name}` : ''}
            </Text>
          </View>
        ) : undefined
      }>
      <Text style={cardText.title} numberOfLines={1}>
        {c.player.alias}
      </Text>
      <Text style={cardText.line}>
        {ROLE_LABELS[c.player.role] ?? c.player.role} · {c.player.timezone}
      </Text>
      <Text style={cardText.soft}>⏱ Coincide {c.result.overlapHours} h con vuestra sesión</Text>
      {c.player.characters.filter((ch) => ch.status === 'looking').length > 0 && (
        <Text style={cardText.soft} numberOfLines={1}>
          🧝{' '}
          {c.player.characters
            .filter((ch) => ch.status === 'looking')
            .map((ch) => ch.name)
            .join(' · ')}
        </Text>
      )}
    </CardShell>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace({ pathname: '/groups/[id]', params: { id: id! } })
            }
            style={styles.headerButton}>
            <ThemedText type="link">←</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" numberOfLines={1}>
            Candidatos{group ? ` · ${group.name}` : ''}
          </ThemedText>
          <View style={styles.headerButton} />
        </View>

        {loadError ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>📡</Text>
            <ThemedText style={styles.centerText}>No se pudieron cargar los candidatos.</ThemedText>
            <Pressable style={styles.retryButton} onPress={load}>
              <ThemedText>Reintentar</ThemedText>
            </Pressable>
          </View>
        ) : candidates === undefined ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
          </View>
        ) : !current ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>🧭</Text>
            <ThemedText style={styles.centerText}>
              No hay más candidatos compatibles por ahora. Los jugadores nuevos que
              encajen con vuestro horario y sistema irán apareciendo aquí.
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.deckArea}>
              <SwipeDeck
                items={candidates}
                index={index}
                keyFor={(c) => c.player.id}
                renderCard={renderCard}
                onSwiped={handleSwiped}
                likeLabel="NOS INTERESA"
                deckRef={deckRef}
              />
              <DetailsSheet
                visible={showDetails}
                title={current.player.alias}
                onClose={() => setShowDetails(false)}>
                {current.player.bio && (
                  <>
                    <Text style={sheetText.label}>Bio</Text>
                    <Text style={sheetText.body}>{current.player.bio}</Text>
                  </>
                )}
                {current.player.characters.filter((ch) => ch.status === 'looking').length > 0 && (
                  <>
                    <Text style={sheetText.label}>Vitrina de personajes</Text>
                    {current.player.characters
                      .filter((ch) => ch.status === 'looking')
                      .map((ch) => (
                        <Text key={ch.id} style={sheetText.body}>
                          {[ch.name, ch.archetype, ch.systems?.name].filter(Boolean).join(' · ')}
                        </Text>
                      ))}
                  </>
                )}
                <Text style={sheetText.label}>Compatibilidad</Text>
                <Text style={sheetText.body}>
                  {current.result.score}% — coincide {current.result.overlapHours} h con vuestra
                  sesión
                </Text>
                <View style={styles.moderationRow}>
                  <Pressable
                    onPress={() => {
                      setShowDetails(false);
                      router.push({
                        pathname: '/report',
                        params: { kind: 'user', id: current.player.id, name: current.player.alias },
                      });
                    }}>
                    <Text style={sheetText.link}>Reportar</Text>
                  </Pressable>
                  <Pressable onPress={handleBlock}>
                    <Text style={sheetText.link}>Bloquear</Text>
                  </Pressable>
                </View>
              </DetailsSheet>
            </View>

            <ActionBar
              onPass={() => deckRef.current?.swipe('pass')}
              onLike={() => deckRef.current?.swipe('like')}
              onInfo={() => setShowDetails((s) => !s)}
            />
          </>
        )}
      </SafeAreaView>

      <MatchOverlay
        visible={matchWith !== null}
        left={{ imageUrl: group?.image_url ?? null, fallbackEmoji: '🎲' }}
        right={{ imageUrl: matchWith?.player.avatar_url ?? null, fallbackEmoji: '🧙' }}
        subtitle={
          matchWith
            ? `${matchWith.player.alias} también quiere jugar en vuestra mesa. El bot os está abriendo un canal en Discord.`
            : ''
        }
        onClose={() => setMatchWith(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: DECK_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  headerButton: {
    width: 44,
    alignItems: 'flex-start',
  },
  deckArea: {
    flex: 1,
    position: 'relative',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centerEmoji: {
    fontSize: 56,
  },
  centerText: {
    textAlign: 'center',
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  scoreBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  scoreText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  likedBanner: {
    backgroundColor: 'rgba(88,101,242,0.85)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  likedText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  moderationRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.four,
  },
});
