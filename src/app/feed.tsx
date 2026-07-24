import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { Chip } from '@/components/chip';
import { ActionBar } from '@/components/swipe/action-bar';
import { CardShell, cardText } from '@/components/swipe/card-shell';
import { SwipeDeck, type SwipeChoice, type SwipeDeckHandle } from '@/components/swipe/deck';
import { DetailsSheet, sheetText } from '@/components/swipe/details-sheet';
import { MatchOverlay } from '@/components/swipe/match-overlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchMyCharacters, type Character } from '@/lib/characters';
import { fetchPlayerFeed, type GroupCandidate } from '@/lib/feed';
import { FORMAT_LABELS, SLOT_LABELS, VTT_LABELS, WEEKDAY_LABELS } from '@/lib/groups';
import { blockUser } from '@/lib/moderation';
import { fetchProfileData } from '@/lib/profile';
import { swipeOnGroup } from '@/lib/swipes';

const DECK_MAX_WIDTH = 420;

function styleLabel(value: number, low: string, high: string) {
  if (value <= 25) return low;
  if (value >= 75) return high;
  return `${low}/${high} equilibrado`;
}

export default function FeedScreen() {
  const session = useSession();
  const deckRef = useRef<SwipeDeckHandle | null>(null);

  const [candidates, setCandidates] = useState<GroupCandidate[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [proposedId, setProposedId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [matchWith, setMatchWith] = useState<GroupCandidate | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    setCandidates(undefined);
    setIndex(0);
    setProposedId(null);
    setShowDetails(false);
    fetchPlayerFeed(session.user.id)
      .then(setCandidates)
      .catch(() => setLoadError(true));
    fetchMyCharacters(session.user.id)
      .then((all) => setMyCharacters(all.filter((c) => c.status === 'looking')))
      .catch(() => {});
    fetchProfileData(session.user.id)
      .then((p) => setMyAvatar(p.avatar_url))
      .catch(() => {});
  }, [session]);

  useFocusEffect(load);

  const current = candidates?.[index];

  const handleSwiped = (item: GroupCandidate, choice: SwipeChoice) => {
    if (!session) return;
    const proposal = proposedId;
    setShowDetails(false);
    setProposedId(null);
    setIndex((i) => i + 1);
    swipeOnGroup(session.user.id, item.group.id, choice === 'like' ? 'like' : 'pass', proposal)
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
      const ownerId = current.group.owner_id;
      await blockUser(session.user.id, ownerId);
      setShowDetails(false);
      setCandidates((list) => list?.filter((c) => c.group.owner_id !== ownerId));
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : String(error));
    }
  };

  const renderCard = (c: GroupCandidate) => {
    const schedule =
      c.group.session_weekday !== null && c.group.session_slot !== null
        ? `${WEEKDAY_LABELS[c.group.session_weekday]} · ${SLOT_LABELS[c.group.session_slot]} (${c.group.timezone})`
        : 'Horario por definir';
    return (
      <CardShell
        imageUrl={c.group.image_url}
        fallbackEmoji="🎲"
        topRight={
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{c.result.score}%</Text>
          </View>
        }>
        <Text style={cardText.title} numberOfLines={2}>
          {c.group.name}
        </Text>
        <Text style={cardText.line}>
          {c.group.systems?.name ?? 'Sistema sin definir'} · {FORMAT_LABELS[c.group.format]}
          {c.group.frequency ? ` · ${c.group.frequency.toLowerCase()}` : ''}
        </Text>
        <Text style={cardText.soft}>📅 {schedule}</Text>
        <Text style={cardText.soft}>
          ⏱ Coincidís {c.result.overlapHours} h · {VTT_LABELS[c.group.vtt]}
        </Text>
      </CardShell>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.headerButton}>
            <ThemedText type="link">←</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">Mesas para ti</ThemedText>
          <View style={styles.headerButton} />
        </View>

        {loadError ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>📡</Text>
            <ThemedText style={styles.centerText}>No se pudo cargar el feed.</ThemedText>
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
            <Text style={styles.centerEmoji}>🃏</Text>
            <ThemedText style={styles.centerText}>
              No hay más mesas compatibles por ahora. Vuelve más tarde, o amplía tu
              disponibilidad y sistemas en tu perfil.
            </ThemedText>
            <Pressable style={styles.retryButton} onPress={() => router.push('/onboarding')}>
              <ThemedText>Ajustar mi perfil</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.deckArea}>
              <SwipeDeck
                items={candidates}
                index={index}
                keyFor={(c) => c.group.id}
                renderCard={renderCard}
                onSwiped={handleSwiped}
                deckRef={deckRef}
              />
              <DetailsSheet
                visible={showDetails}
                title={current.group.name}
                onClose={() => setShowDetails(false)}>
                {current.group.description && (
                  <>
                    <Text style={sheetText.label}>Sobre la mesa</Text>
                    <Text style={sheetText.body}>{current.group.description}</Text>
                  </>
                )}
                <Text style={sheetText.label}>Estilo</Text>
                <Text style={sheetText.body}>
                  {styleLabel(current.group.style_combat_narrative, 'Combate', 'Narrativo')} ·{' '}
                  {styleLabel(current.group.style_serious_humor, 'Serio', 'Humor')} ·{' '}
                  {styleLabel(current.group.style_roleplay_weight, 'Roleo ligero', 'Roleo pesado')}
                </Text>
                <Text style={sheetText.label}>Compatibilidad</Text>
                <Text style={sheetText.body}>
                  {current.result.score}% — coincidís {current.result.overlapHours} h en horario ·{' '}
                  {VTT_LABELS[current.group.vtt]}
                </Text>
                <View style={styles.moderationRow}>
                  <Pressable
                    onPress={() => {
                      setShowDetails(false);
                      router.push({
                        pathname: '/report',
                        params: { kind: 'group', id: current.group.id, name: current.group.name },
                      });
                    }}>
                    <Text style={sheetText.link}>Reportar mesa</Text>
                  </Pressable>
                  <Pressable onPress={handleBlock}>
                    <Text style={sheetText.link}>Bloquear al GM</Text>
                  </Pressable>
                </View>
              </DetailsSheet>
            </View>

            {myCharacters.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.proposalStrip}
                contentContainerStyle={styles.proposalContent}>
                <ThemedText type="small" style={styles.proposalLabel}>
                  Proponer:
                </ThemedText>
                {myCharacters.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    selected={proposedId === c.id}
                    onPress={() => setProposedId(proposedId === c.id ? null : c.id)}
                  />
                ))}
              </ScrollView>
            )}

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
        left={{ imageUrl: myAvatar, fallbackEmoji: '🧙' }}
        right={{ imageUrl: matchWith?.group.image_url ?? null, fallbackEmoji: '🎲' }}
        subtitle={
          matchWith
            ? `A «${matchWith.group.name}» también le interesas. El bot os está abriendo un canal en Discord.`
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
  proposalStrip: {
    flexGrow: 0,
    marginTop: Spacing.two,
  },
  proposalContent: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  proposalLabel: {
    marginRight: Spacing.one,
  },
  moderationRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.four,
  },
});
