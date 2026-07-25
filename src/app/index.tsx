// Página principal: el feed de descubrimiento (estilo Tinder). Los menús
// viven en el panel superior derecho (avatar).

import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { ActionBar } from '@/components/swipe/action-bar';
import {
  AvailabilityMiniGrid,
  availabilityCellKey,
} from '@/components/swipe/availability-mini-grid';
import { CardCycle } from '@/components/swipe/card-cycle';
import { CardChip, CardChipRow, CardShell, cardText } from '@/components/swipe/card-shell';
import { CharacterLikeButton } from '@/components/swipe/character-like-button';
import { SwipeDeck, type SwipeChoice, type SwipeDeckHandle } from '@/components/swipe/deck';
import { DetailsFace, sheetText } from '@/components/swipe/details-face';
import { MatchOverlay } from '@/components/swipe/match-overlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Rolder, RolderFonts, Spacing } from '@/constants/theme';
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
import { registerPushToken } from '@/lib/notifications';
import { fetchPremiumStatus, isBoostActive } from '@/lib/premium';
import { fetchProfileData, hasCompletedOnboarding } from '@/lib/profile';
import {
  groupSwipeOnUser,
  swipeOnGroup,
  undoGroupSwipeOnUser,
  undoSwipeOnGroup,
} from '@/lib/swipes';

const DECK_MAX_WIDTH = 420;
// Tweak del handoff rolder: el % de compatibilidad va oculto por defecto
const SHOW_SCORE = false;

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

export default function HomeScreen() {
  const session = useSession();
  const deckRef = useRef<SwipeDeckHandle | null>(null);

  const [onboarded, setOnboarded] = useState<boolean | undefined>(undefined);
  const [items, setItems] = useState<FeedItem[] | undefined>(undefined);
  const [myAvailability, setMyAvailability] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [proposedId, setProposedId] = useState<string | null>(null);
  const [matchWith, setMatchWith] = useState<FeedItem | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  const [lastSwiped, setLastSwiped] = useState<FeedItem | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    setItems(undefined);
    setIndex(0);
    setProposedId(null);
    setLastSwiped(null);
    hasCompletedOnboarding(session.user.id)
      .then(setOnboarded)
      .catch(() => setOnboarded(true));
    registerPushToken(session.user.id);
    fetchPremiumStatus(session.user.id)
      .then((status) => setPremium(status.active))
      .catch(() => {});
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

  // Teclado en web: ← pass · → like (handoff rolder §2)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') deckRef.current?.swipe('pass');
      else if (event.key === 'ArrowRight') deckRef.current?.swipe('like');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const current = items?.[index];

  const handleSwiped = (item: FeedItem, choice: SwipeChoice) => {
    if (!session) return;
    const proposal = proposedId;
    setProposedId(null);
    setIndex((i) => i + 1);

    const direction = choice === 'like' ? ('like' as const) : ('pass' as const);
    const request =
      item.kind === 'group'
        ? swipeOnGroup(session.user.id, item.group.id, direction, proposal)
        : groupSwipeOnUser(item.forGroup.id, item.candidate.player.id, direction);

    setLastSwiped(item);
    request
      .then((matched) => {
        if (matched) {
          setMatchWith(item);
          setLastSwiped(null); // un match no se puede deshacer
        }
      })
      .catch((error) =>
        showAlert('No se pudo guardar el swipe', error instanceof Error ? error.message : String(error))
      );
  };

  const handleRewind = async () => {
    if (!session) return;
    if (!premium) {
      showAlert(
        '↩ Rewind es premium',
        'Deshacer el último swipe es una función premium. Los testers de la alpha la tienen incluida — pídesela a Chris.'
      );
      return;
    }
    if (!lastSwiped || index === 0) return;
    try {
      if (lastSwiped.kind === 'group') {
        await undoSwipeOnGroup(session.user.id, lastSwiped.group.id);
      } else {
        await undoGroupSwipeOnUser(lastSwiped.forGroup.id, lastSwiped.candidate.player.id);
      }
      setLastSwiped(null);
      setIndex((i) => Math.max(0, i - 1));
    } catch (error) {
      showAlert('No se pudo deshacer', error instanceof Error ? error.message : String(error));
    }
  };

  const handleBlock = async () => {
    if (!session || !current) return;
    try {
      const blockedId =
        current.kind === 'group' ? current.group.owner_id : current.candidate.player.id;
      await blockUser(session.user.id, blockedId);
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
            SHOW_SCORE ? (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{item.result.score}%</Text>
              </View>
            ) : undefined
          }
          banner={
            isBoostActive(g.boosted_until) ? (
              <View style={styles.boostBanner}>
                <Text style={styles.boostText} numberOfLines={1}>
                  🚀 Mesa destacada
                </Text>
              </View>
            ) : g.format === 'oneshot' ? (
              <View style={styles.oneshotBanner}>
                <Text style={styles.oneshotText} numberOfLines={1}>
                  🎬 One-shot — la primera cita perfecta
                </Text>
              </View>
            ) : undefined
          }>
          <Text style={cardText.title} numberOfLines={2}>
            {g.name}
          </Text>
          <CardChipRow>
            <CardChip label={g.systems?.name ?? 'Sistema sin definir'} />
            <CardChip label={FORMAT_LABELS[g.format]} />
            {g.frequency && <CardChip label={g.frequency} />}
            <CardChip label={VTT_LABELS[g.vtt]} />
          </CardChipRow>
          <CardChipRow>
            <CardChip
              variant="green"
              label={
                g.session_weekday !== null && g.session_slot !== null
                  ? `📅 ${WEEKDAY_LABELS[g.session_weekday]} ${SLOT_LABELS[
                      g.session_slot
                    ].toLowerCase()} · coincidís ${item.result.overlapHours} h`
                  : `📅 Horario por definir · coincidís ${item.result.overlapHours} h`
              }
            />
          </CardChipRow>
        </CardShell>
      );
    }

    const c = item.candidate;
    const publicLooking = c.player.characters.filter(
      (ch) => ch.status === 'looking' && ch.is_public
    );
    const playerFace = (
      <CardShell
        imageUrl={c.player.avatar_url}
        fallbackEmoji="🧙"
        fallbackColors={['#5865F2', '#8B6CFF']}
        topRight={
          SHOW_SCORE ? (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{c.result.score}%</Text>
            </View>
          ) : undefined
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
        <CardChipRow>
          <CardChip label={ROLE_LABELS[c.player.role] ?? c.player.role} />
          <CardChip label={c.player.timezone} />
        </CardChipRow>
        <CardChipRow>
          <CardChip
            variant="green"
            label={`⏱ Coincide ${c.result.overlapHours} h con vuestra sesión`}
          />
        </CardChipRow>
        <Text style={cardText.soft}>
          🛡️ Candidato para «{item.forGroup.name}»
          {publicLooking.length > 0 ? ' · toca para ver sus personajes' : ''}
        </Text>
      </CardShell>
    );
    const characterFaces = publicLooking.map((ch) => (
      <CardShell
        key={ch.id}
        imageUrl={ch.portrait_url}
        fallbackEmoji="🧝"
        fallbackColors={['#FF5A5F', '#8B6CFF']}
        topRight={
          session ? <CharacterLikeButton characterId={ch.id} viewerId={session.user.id} /> : undefined
        }>
        <Text style={styles.characterOf}>Personaje de {c.player.alias}</Text>
        <Text style={cardText.title} numberOfLines={1}>
          {ch.name}
        </Text>
        <CardChipRow>
          {ch.archetype && <CardChip label={ch.archetype} />}
          {ch.systems?.name && <CardChip label={ch.systems.name} />}
          {ch.level != null && <CardChip label={`Nivel ${ch.level}`} />}
        </CardChipRow>
        {ch.concept && (
          <Text style={styles.characterConcept} numberOfLines={2}>
            {ch.concept}
          </Text>
        )}
      </CardShell>
    ));
    return <CardCycle faces={[playerFace, ...characterFaces]} />;
  };

  const detailsFor = (item: FeedItem) => {
    if (item.kind === 'group') {
      const g = item.group;
      return (
        <>
          {g.description && (
            <>
              <Text style={sheetText.label}>Sobre la mesa</Text>
              <Text style={sheetText.body} numberOfLines={4}>
                {g.description}
              </Text>
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
          <Pressable
            onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}>
            <Text style={styles.profileLink}>Ver mesa completa ›</Text>
          </Pressable>
          <View style={styles.moderationRow}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/report',
                  params: { kind: 'group', id: g.id, name: g.name },
                })
              }>
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
            <Text style={sheetText.body} numberOfLines={3}>
              {c.player.bio}
            </Text>
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
        {c.player.reliability && c.player.reliability.count > 0 && (
          <Text style={sheetText.body}>
            Fiabilidad: 🎲 {c.player.reliability.average.toFixed(1)}/5 (
            {c.player.reliability.count}{' '}
            {c.player.reliability.count === 1 ? 'valoración' : 'valoraciones'})
          </Text>
        )}
        <Pressable
          onPress={() =>
            router.push({ pathname: '/players/[id]', params: { id: c.player.id } })
          }>
          <Text style={styles.profileLink}>Ver perfil completo ›</Text>
        </Pressable>
        <View style={styles.moderationRow}>
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
  };

  if (onboarded === false) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader />

        {loadError ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>📡</Text>
            <ThemedText style={styles.centerText}>No se pudo cargar el feed.</ThemedText>
            <Pressable style={styles.retryButton} onPress={load}>
              <ThemedText>Reintentar</ThemedText>
            </Pressable>
          </View>
        ) : items === undefined || onboarded === undefined ? (
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
            <Pressable style={styles.retryButton} onPress={load}>
              <Text style={styles.retryLabel}>Volver a empezar</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/onboarding')}>
              <ThemedText type="small" themeColor="textSecondary">
                Ajustar mi perfil
              </ThemedText>
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
                renderDetails={(item) => (
                  <DetailsFace
                    title={item.kind === 'group' ? item.group.name : item.candidate.player.alias}>
                    {detailsFor(item)}
                  </DetailsFace>
                )}
                onSwiped={handleSwiped}
                deckRef={deckRef}
              />
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
              onInfo={() => deckRef.current?.toggleDetails()}
              onRewind={handleRewind}
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
    borderColor: 'rgba(139,108,255,0.8)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: Spacing.four,
  },
  retryLabel: {
    color: Rolder.violetSofter,
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
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
    backgroundColor: 'rgba(88,101,242,0.92)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  oneshotBanner: {
    backgroundColor: 'rgba(59,209,111,0.88)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  boostBanner: {
    backgroundColor: 'rgba(245,166,35,0.92)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  oneshotText: {
    color: Rolder.onLike,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    fontSize: 13.5,
    textAlign: 'center',
  },
  boostText: {
    color: Rolder.onGold,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    fontSize: 13.5,
    textAlign: 'center',
  },
  likedText: {
    color: '#fff',
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    fontSize: 13.5,
    textAlign: 'center',
  },
  characterOf: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  characterConcept: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    fontStyle: 'italic',
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
  profileLink: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    marginTop: 8,
  },
});
