import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { ActionBar } from '@/components/swipe/action-bar';
import {
  AvailabilityMiniGrid,
  availabilityCellKey,
} from '@/components/swipe/availability-mini-grid';
import { CardCycle } from '@/components/swipe/card-cycle';
import { CardShell, cardText } from '@/components/swipe/card-shell';
import { CharacterLikeButton } from '@/components/swipe/character-like-button';
import { SwipeDeck, type SwipeChoice, type SwipeDeckHandle } from '@/components/swipe/deck';
import { DetailsFace, sheetText } from '@/components/swipe/details-face';
import { MatchOverlay } from '@/components/swipe/match-overlay';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { getOrCreateDmThread } from '@/lib/dm';
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
  const [matchWith, setMatchWith] = useState<PlayerCandidate | null>(null);

  const load = useCallback(() => {
    if (!id || !session) return;
    setLoadError(false);
    setCandidates(undefined);
    setIndex(0);
    // solo la cola de solicitudes (likes recibidos); el descubrimiento de
    // compatibles vive en el feed principal
    fetchGroupCandidates(id, session.user.id, { onlyApplicants: true })
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
    setIndex((i) => i + 1);
    groupSwipeOnUser(id, item.player.id, choice === 'like' ? 'like' : 'pass')
      .then((matched) => {
        if (matched) setMatchWith(item);
      })
      .catch((error) =>
        showAlert('No se pudo guardar el swipe', error instanceof Error ? error.message : String(error))
      );
  };

  // Negociar antes de aceptar (p. ej. mesa llena): DM directo con el candidato
  const handleTalk = async (candidate: PlayerCandidate) => {
    if (!session) return;
    try {
      const threadId = await getOrCreateDmThread(session.user.id, candidate.player.id);
      router.push({ pathname: '/dm/[id]', params: { id: threadId } });
    } catch (error) {
      showAlert(
        'No se pudo abrir el chat',
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleBlock = async () => {
    if (!session || !current) return;
    try {
      const blockedId = current.player.id;
      await blockUser(session.user.id, blockedId);
      setCandidates((list) => list?.filter((c) => c.player.id !== blockedId));
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : String(error));
    }
  };

  const renderCard = (c: PlayerCandidate) => {
    const publicLooking = c.player.characters.filter(
      (ch) => ch.status === 'looking' && ch.is_public
    );
    const playerFace = (
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
                💘 Le gustáis{c.proposal ? ` — propone a ${c.proposal.name}` : ''}
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
        <Text style={cardText.soft}>
          ⏱ Coincide {c.result.overlapHours} h con vuestra sesión
          {publicLooking.length > 0 ? ' · toca para ver sus personajes' : ''}
        </Text>
      </CardShell>
    );
    const characterFaces = publicLooking.map((ch) => (
      <CardShell
        key={ch.id}
        imageUrl={ch.portrait_url}
        fallbackEmoji="🧝"
        topRight={
          session ? <CharacterLikeButton characterId={ch.id} viewerId={session.user.id} /> : undefined
        }>
        <Text style={cardText.soft}>Personaje de {c.player.alias}</Text>
        <Text style={cardText.title} numberOfLines={1}>
          {ch.name}
        </Text>
        <Text style={cardText.line}>
          {[ch.archetype, ch.systems?.name, ch.level && `nivel ${ch.level}`]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {ch.concept && (
          <Text style={cardText.soft} numberOfLines={2}>
            {ch.concept}
          </Text>
        )}
      </CardShell>
    ));
    return <CardCycle faces={[playerFace, ...characterFaces]} />;
  };

  const detailsFor = (c: PlayerCandidate) => (
    <>
      {c.player.bio && (
        <>
          <Text style={sheetText.label}>Bio</Text>
          <Text style={sheetText.body} numberOfLines={3}>
            {c.player.bio}
          </Text>
        </>
      )}
      <Text style={sheetText.label}>Su semana vs vuestra sesión</Text>
      <AvailabilityMiniGrid
        cells={new Set(c.player.availability.map((a) => availabilityCellKey(a.weekday, a.slot)))}
        highlight={
          group && group.session_weekday !== null && group.session_slot !== null
            ? { weekday: group.session_weekday, slot: group.session_slot }
            : null
        }
      />
      <Text style={sheetText.label}>Compatibilidad</Text>
      <Text style={sheetText.body}>
        {c.result.score}% — coincide {c.result.overlapHours} h con vuestra sesión
      </Text>
      {c.player.reliability && c.player.reliability.count > 0 && (
        <Text style={sheetText.body}>
          Fiabilidad: 🎲 {c.player.reliability.average.toFixed(1)}/5 (
          {c.player.reliability.count}{' '}
          {c.player.reliability.count === 1 ? 'valoración' : 'valoraciones'})
        </Text>
      )}
      <View style={styles.moderationRow}>
        <Pressable onPress={() => handleTalk(c)}>
          <Text style={sheetText.link}>💬 Hablar antes</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/report',
              params: { kind: 'user', id: c.player.id, name: c.player.alias },
            })
          }>
          <Text style={sheetText.link}>Reportar</Text>
        </Pressable>
        <Pressable onPress={handleBlock}>
          <Text style={sheetText.link}>Bloquear</Text>
        </Pressable>
      </View>
    </>
  );

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
        <ThemedText type="small" numberOfLines={1} style={styles.subheader}>
          Piden sitio{group ? ` · ${group.name}` : ''}
        </ThemedText>

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
              Nadie pide sitio ahora mismo. Cuando un jugador dé like a vuestra mesa
              aparecerá aquí para que decidas: aceptar, hablar antes o pasar. Para
              descubrir gente compatible, usa el feed principal.
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
                renderDetails={(c) => (
                  <DetailsFace title={c.player.alias}>{detailsFor(c)}</DetailsFace>
                )}
                onSwiped={handleSwiped}
                likeLabel="NOS INTERESA"
                deckRef={deckRef}
              />
            </View>

            <ActionBar
              onPass={() => deckRef.current?.swipe('pass')}
              onLike={() => deckRef.current?.swipe('like')}
              onInfo={() => deckRef.current?.toggleDetails()}
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
            ? `${matchWith.player.alias} ya es de la mesa: os espera en su chat.`
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
  subheader: {
    marginBottom: Spacing.two,
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
