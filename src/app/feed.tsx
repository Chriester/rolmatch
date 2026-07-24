import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { Chip } from '@/components/chip';
import { ActionBar } from '@/components/swipe/action-bar';
import {
  AvailabilityMiniGrid,
  availabilityCellKey,
} from '@/components/swipe/availability-mini-grid';
import { CardFlip } from '@/components/swipe/card-flip';
import { CardShell, cardText } from '@/components/swipe/card-shell';
import { SwipeDeck, type SwipeChoice, type SwipeDeckHandle } from '@/components/swipe/deck';
import { DetailsSheet, sheetText } from '@/components/swipe/details-sheet';
import { MatchOverlay } from '@/components/swipe/match-overlay';
import { ShowcaseBack } from '@/components/swipe/showcase-back';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchMyCharacters, type Character } from '@/lib/characters';
import { fetchUnifiedFeed, type FeedItem } from '@/lib/feed';
import {
  EXPERIENCE_LABELS,
  FORMAT_LABELS,
  SLOT_HOURS,
  SLOT_LABELS,
  VTT_LABELS,
  WEEKDAY_LABELS,
} from '@/lib/groups';
import { blockUser } from '@/lib/moderation';
import { fetchProfileData } from '@/lib/profile';
import { groupSwipeOnUser, swipeOnGroup } from '@/lib/swipes';

const DECK_MAX_WIDTH = 420;

const ROLE_LABELS: Record<string, string> = {
  player: 'Jugador/a',
  gm: 'GM',
  both: 'Jugador/a y GM',
};

function styleLabel(value: number, low: string, high: string) {
  if (value <= 25) return low;
  if (value >= 75) return high;
  return `${low}/${high} equilibrado`;
}

function scheduleLine(weekday: number | null, slot: number | null, timezone: string) {
  if (weekday === null || slot === null) return 'Horario por definir';
  return `${WEEKDAY_LABELS[weekday]} · ${SLOT_LABELS[slot]} (${SLOT_HOURS[slot]}, ${timezone})`;
}

function itemKey(item: FeedItem) {
  return item.kind === 'group' ? `g-${item.group.id}` : `p-${item.candidate.player.id}`;
}

export default function FeedScreen() {
  const session = useSession();
  const deckRef = useRef<SwipeDeckHandle | null>(null);

  const [items, setItems] = useState<FeedItem[] | undefined>(undefined);
  const [myAvailability, setMyAvailability] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [proposedId, setProposedId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [matchWith, setMatchWith] = useState<FeedItem | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    setItems(undefined);
    setIndex(0);
    setProposedId(null);
    setShowDetails(false);
    fetchUnifiedFeed(session.user.id)
      .then((feed) => {
        setItems(feed.items);
        setMyAvailability(
          new Set(feed.myAvailability.map((a) => availabilityCellKey(a.weekday, a.slot)))
        );
      })
      .catch(() => setLoadError(true));
    fetchMyCharacters(session.user.id)
      .then((all) => setMyCharacters(all.filter((c) => c.status === 'looking')))
      .catch(() => {});
    fetchProfileData(session.user.id)
      .then((p) => setMyAvatar(p.avatar_url))
      .catch(() => {});
  }, [session]);

  useFocusEffect(load);

  const current = items?.[index];

  const handleSwiped = (item: FeedItem, choice: SwipeChoice) => {
    if (!session) return;
    const proposal = proposedId;
    setShowDetails(false);
    setProposedId(null);
    setIndex((i) => i + 1);

    const direction = choice === 'like' ? ('like' as const) : ('pass' as const);
    const request =
      item.kind === 'group'
        ? swipeOnGroup(session.user.id, item.group.id, direction, proposal)
        : groupSwipeOnUser(item.forGroup.id, item.candidate.player.id, direction);

    request
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
      const blockedId =
        current.kind === 'group' ? current.group.owner_id : current.candidate.player.id;
      await blockUser(session.user.id, blockedId);
      setShowDetails(false);
      setItems((list) =>
        list?.filter((i) =>
          i.kind === 'group' ? i.group.owner_id !== blockedId : i.candidate.player.id !== blockedId
        )
      );
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : String(error));
    }
  };

  const renderCard = (item: FeedItem) => {
    if (item.kind === 'group') {
      const g = item.group;
      return (
        <CardShell
          imageUrl={g.image_url}
          fallbackEmoji="🎲"
          topRight={
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{item.result.score}%</Text>
            </View>
          }>
          <Text style={cardText.title} numberOfLines={2}>
            {g.name}
          </Text>
          <Text style={cardText.line}>
            {g.systems?.name ?? 'Sistema sin definir'} · {FORMAT_LABELS[g.format]}
            {g.frequency ? ` · ${g.frequency.toLowerCase()}` : ''}
          </Text>
          <Text style={cardText.soft}>
            📅 {scheduleLine(g.session_weekday, g.session_slot, g.timezone)}
          </Text>
          <Text style={cardText.soft}>⏱ Coincidís {item.result.overlapHours} h en horario</Text>
        </CardShell>
      );
    }

    const c = item.candidate;
    const publicLooking = c.player.characters.filter(
      (ch) => ch.status === 'looking' && ch.is_public
    );
    const front = (
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
        <Text style={cardText.soft}>🛡️ Candidato para «{item.forGroup.name}»</Text>
        <Text style={cardText.soft}>
          ⏱ Coincide {c.result.overlapHours} h con vuestra sesión
          {publicLooking.length > 0 ? ' · toca para ver su vitrina' : ''}
        </Text>
      </CardShell>
    );
    return <CardFlip front={front} back={<ShowcaseBack alias={c.player.alias} characters={publicLooking} />} />;
  };

  const detailsFor = (item: FeedItem) => {
    if (item.kind === 'group') {
      const g = item.group;
      return (
        <>
          {g.description && (
            <>
              <Text style={sheetText.label}>Sobre la mesa</Text>
              <Text style={sheetText.body}>{g.description}</Text>
            </>
          )}
          <Text style={sheetText.label}>Horario</Text>
          <Text style={sheetText.body}>
            {scheduleLine(g.session_weekday, g.session_slot, g.timezone)}
            {g.frequency ? ` · ${g.frequency.toLowerCase()}` : ''}
          </Text>
          <AvailabilityMiniGrid
            cells={myAvailability}
            highlight={
              g.session_weekday !== null && g.session_slot !== null
                ? { weekday: g.session_weekday, slot: g.session_slot }
                : null
            }
          />
          <Text style={sheetText.label}>Estilo y mesa</Text>
          <Text style={sheetText.body}>
            {styleLabel(g.style_combat_narrative, 'Combate', 'Narrativo')} ·{' '}
            {styleLabel(g.style_serious_humor, 'Serio', 'Humor')} ·{' '}
            {styleLabel(g.style_roleplay_weight, 'Roleo ligero', 'Roleo pesado')}
          </Text>
          <Text style={sheetText.body}>
            {VTT_LABELS[g.vtt]}
            {g.experience_wanted
              ? ` · busca nivel ${EXPERIENCE_LABELS[g.experience_wanted].toLowerCase()}`
              : ' · cualquier nivel de experiencia'}
          </Text>
          <Text style={sheetText.label}>Compatibilidad</Text>
          <Text style={sheetText.body}>
            {item.result.score}% — coincidís {item.result.overlapHours} h en horario
          </Text>
          <View style={styles.moderationRow}>
            <Pressable
              onPress={() => {
                setShowDetails(false);
                router.push({
                  pathname: '/report',
                  params: { kind: 'group', id: g.id, name: g.name },
                });
              }}>
              <Text style={sheetText.link}>Reportar mesa</Text>
            </Pressable>
            <Pressable onPress={handleBlock}>
              <Text style={sheetText.link}>Bloquear al GM</Text>
            </Pressable>
          </View>
        </>
      );
    }

    const c = item.candidate;
    return (
      <>
        {c.player.bio && (
          <>
            <Text style={sheetText.label}>Bio</Text>
            <Text style={sheetText.body}>{c.player.bio}</Text>
          </>
        )}
        <Text style={sheetText.label}>Su semana vs vuestra sesión</Text>
        <AvailabilityMiniGrid
          cells={new Set(c.player.availability.map((a) => availabilityCellKey(a.weekday, a.slot)))}
          highlight={
            item.forGroup.session_weekday !== null && item.forGroup.session_slot !== null
              ? { weekday: item.forGroup.session_weekday, slot: item.forGroup.session_slot }
              : null
          }
        />
        <Text style={sheetText.label}>Compatibilidad</Text>
        <Text style={sheetText.body}>
          {c.result.score}% para «{item.forGroup.name}» — coincide {c.result.overlapHours} h
        </Text>
        <View style={styles.moderationRow}>
          <Pressable
            onPress={() => {
              setShowDetails(false);
              router.push({
                pathname: '/report',
                params: { kind: 'user', id: c.player.id, name: c.player.alias },
              });
            }}>
            <Text style={sheetText.link}>Reportar</Text>
          </Pressable>
          <Pressable onPress={handleBlock}>
            <Text style={sheetText.link}>Bloquear</Text>
          </Pressable>
        </View>
      </>
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
          <ThemedText type="subtitle">Descubrir</ThemedText>
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
        ) : items === undefined ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
          </View>
        ) : !current ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>🃏</Text>
            <ThemedText style={styles.centerText}>
              No hay más mesas ni candidatos compatibles por ahora. Amplía tu
              disponibilidad y sistemas, o vuelve más tarde.
            </ThemedText>
            <Pressable style={styles.retryButton} onPress={() => router.push('/onboarding')}>
              <ThemedText>Ajustar mi perfil</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.deckArea}>
              <SwipeDeck
                items={items}
                index={index}
                keyFor={itemKey}
                renderCard={renderCard}
                onSwiped={handleSwiped}
                onSwipeUp={() => setShowDetails(true)}
                likeLabel={current.kind === 'group' ? 'ME INTERESA' : 'NOS INTERESA'}
                deckRef={deckRef}
              />
              <DetailsSheet
                visible={showDetails}
                title={current.kind === 'group' ? current.group.name : current.candidate.player.alias}
                onClose={() => setShowDetails(false)}>
                {detailsFor(current)}
              </DetailsSheet>
            </View>

            {current.kind === 'group' && myCharacters.length > 0 && (
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
        left={{
          imageUrl: matchWith?.kind === 'player' ? matchWith.forGroup.image_url : myAvatar,
          fallbackEmoji: matchWith?.kind === 'player' ? '🎲' : '🧙',
        }}
        right={{
          imageUrl:
            matchWith?.kind === 'group'
              ? matchWith.group.image_url
              : (matchWith?.candidate.player.avatar_url ?? null),
          fallbackEmoji: matchWith?.kind === 'group' ? '🎲' : '🧙',
        }}
        subtitle={
          matchWith?.kind === 'group'
            ? `A «${matchWith.group.name}» también le interesas. El bot os está abriendo un canal en Discord.`
            : matchWith
              ? `${matchWith.candidate.player.alias} también quiere jugar en «${matchWith.forGroup.name}». El bot os está abriendo un canal en Discord.`
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
