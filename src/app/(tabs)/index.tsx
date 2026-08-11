// Página principal: el feed de descubrimiento (estilo Tinder). Los menús
// viven en el panel superior derecho (avatar).

import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { hasUnseenActivity } from '@/lib/activity';
import { showAlert } from '@/lib/alert';
import { track } from '@/lib/analytics';
import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { ActionBar } from '@/components/swipe/action-bar';
import {
  AvailabilityMiniGrid,
  availabilityCellKey,
} from '@/components/swipe/availability-mini-grid';
import { CharacterSheetView } from '@/components/character-sheet-view';
import { CardCycle } from '@/components/swipe/card-cycle';
import { CardSkeleton } from '@/components/swipe/card-skeleton';
import {
  CardBlurb,
  CardChip,
  CardChipRow,
  CardHint,
  CardShell,
  cardText,
} from '@/components/swipe/card-shell';
import { CharacterLikeButton } from '@/components/swipe/character-like-button';
import { SwipeDeck, type SwipeChoice, type SwipeDeckHandle } from '@/components/swipe/deck';
import { DetailsFace, sheetText } from '@/components/swipe/details-face';
import { MatchOverlay } from '@/components/swipe/match-overlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { characterAgeLabel, fetchMyCharacters, type Character } from '@/lib/characters';
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
import { DISCORD_ENABLED } from '@/lib/config';
import { shouldShowTutorial } from '@/lib/tutorial';
import { levelFromXp, titleForLevel } from '@/lib/xp';
import { fetchPremiumStatus, isBoostActive } from '@/lib/premium';
import {
  GENDER_LABELS,
  ageFromBirthYear,
  fetchProfileData,
  hasCompletedOnboarding,
  type Gender,
} from '@/lib/profile';
import {
  groupSwipeOnUser,
  resetPasses,
  swipeOnGroup,
  undoGroupSwipeOnUser,
  undoSwipeOnGroup,
} from '@/lib/swipes';

const DECK_MAX_WIDTH = 420;
// Tweak del handoff rolder: el % de compatibilidad va oculto por defecto
const SHOW_SCORE = false;

/** Ventana en la que el feed se considera fresco al volver a la pestaña. */
const FEED_FRESH_MS = 2 * 60 * 1000;

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

  // Quien aún no tiene perfil pasa primero por el tutorial (dos pantallas) y
  // de ahí al alta: explicar la app DESPUÉS de rellenar cuatro pasos era
  // cobrar por adelantado. El propio tutorial marca el flag al montarse.
  const [tutorialPending, setTutorialPending] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (onboarded !== false) return;
    shouldShowTutorial()
      .then(setTutorialPending)
      .catch(() => setTutorialPending(false));
  }, [onboarded]);
  const [items, setItems] = useState<FeedItem[] | undefined>(undefined);
  const [myAvailability, setMyAvailability] = useState<Set<string>>(new Set());
  const [filteredOut, setFilteredOut] = useState({
    total: 0,
    schedule: 0,
    system: 0,
    language: 0,
  });
  const [loadError, setLoadError] = useState(false);
  // el mensaje real del fallo, visible en pantalla: sin él es imposible
  // diagnosticar problemas que solo pasan en el dispositivo de alguien
  const [loadErrorDetail, setLoadErrorDetail] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  // cara visible de la tarjeta superior (0 = jugador, 1+ = personajes):
  // decide qué enseña la tira de detalles al deslizar hacia arriba
  const [topFace, setTopFace] = useState(0);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [proposedId, setProposedId] = useState<string | null>(null);
  const [matchWith, setMatchWith] = useState<FeedItem | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  const [lastSwiped, setLastSwiped] = useState<FeedItem | null>(null);
  /** enciende el punto de la campana: hay novedades sin ver */
  const [hasNews, setHasNews] = useState(false);
  /** cuándo y para quién se cargó el feed (para no rehacerlo en cada focus) */
  const lastLoad = useRef<{ userId: string; at: number } | null>(null);

  // Volver de un perfil o de un chat NO debe rehacer el feed: era la consulta
  // más cara de la app, dejaba la pantalla en la rueda y devolvía el mazo a la
  // primera tarjeta, perdiendo por dónde ibas. Refrescamos solo si los datos
  // ya están viejos; «Reintentar» y «volver a barajar» fuerzan.
  const load = useCallback(
    (options?: { force?: boolean }) => {
      if (!session) return;
      // el punto de la campana se recalcula en CADA focus, fuera del
      // throttle del feed: al volver de Novedades tiene que apagarse ya
      hasUnseenActivity(session.user.id).then(setHasNews);
      const fresh =
        lastLoad.current?.userId === session.user.id &&
        Date.now() - lastLoad.current.at < FEED_FRESH_MS;
      if (!options?.force && fresh) return;
      setLoadError(false);
      setLoadErrorDetail(null);
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
          lastLoad.current = { userId: session.user.id, at: Date.now() };
          setItems(feed.items);
          setMyAvailability(
            new Set(feed.myAvailability.map((a) => availabilityCellKey(a.weekday, a.slot)))
          );
          setFilteredOut(feed.filteredOut);
        })
        .catch((error) => {
          setLoadError(true);
          setLoadErrorDetail(error instanceof Error ? error.message : String(error));
        });
      fetchMyCharacters(session.user.id)
        .then((all) => setMyCharacters(all.filter((c) => c.status === 'looking')))
        .catch(() => {});
      fetchProfileData(session.user.id)
        .then((p) => setMyAvatar(p.avatar_url))
        .catch(() => {});
    },
    [session]
  );

  const reload = useCallback(() => load({ force: true }), [load]);

  // Un feed vacío que solo dice «no hay nada» deja al usuario sin saber qué
  // tocar. Si hay mesas que se han caído por un filtro duro, lo decimos y
  // mandamos justo a ese ajuste.
  const emptyReason = (() => {
    const { total, schedule, system, language } = filteredOut;
    if (total === 0) {
      return {
        headline: 'No hay mesas ni jugadores nuevos por ahora.',
        hint: 'Con la comunidad aún pequeña esto pasa: vuelve a barajar lo que descartaste, o monta tú la mesa y que te encuentren.',
        action: '⚙️ Ajustar mi perfil',
      };
    }
    const mesas = total === 1 ? '1 mesa se ha quedado' : `${total} mesas se han quedado`;
    if (schedule >= system && schedule >= language) {
      return {
        headline: `${mesas} fuera por horario.`,
        hint: 'Marca más franjas en tu disponibilidad y vuelven a aparecer.',
        action: '🕒 Ampliar mi disponibilidad',
      };
    }
    if (system >= language) {
      return {
        headline: `${mesas} fuera por sistema de juego.`,
        hint: 'Añade sistemas, o marca «abierto a cualquiera» y las verás todas.',
        action: '🎲 Añadir sistemas',
      };
    }
    return {
      headline: `${mesas} fuera por idioma.`,
      hint: 'Añade los idiomas en los que te apañas para verlas.',
      action: '🗣️ Ajustar mi perfil',
    };
  })();

  // Feed agotado: es el peor primer momento posible para alguien nuevo y no
  // deja rastro en ninguna tabla, así que se registra aquí.
  const exhausted = items !== undefined && index >= items.length;
  useEffect(() => {
    // el desglose de filtros duros es el dato que decide si hay que
    // relajarlos (pendientes.md, B1): sin él el evento solo dice «vacío»
    if (exhausted)
      track(session?.user.id, 'feed_empty', {
        cards: items?.length ?? 0,
        filtered_total: filteredOut.total,
        filtered_schedule: filteredOut.schedule,
        filtered_system: filteredOut.system,
        filtered_language: filteredOut.language,
      });
    // solo al quedarse vacío, no en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhausted]);

  useFocusEffect(load);

  // La tarjeta siguiente ya está montada (carga su foto sola); las dos de
  // después se precargan aquí para que una racha de swipes rápidos no
  // enseñe el degradado fallback mientras llega la imagen.
  useEffect(() => {
    if (!items) return;
    const urls = items
      .slice(index + 2, index + 4)
      .map((item) =>
        item.kind === 'group' ? item.group.image_url : item.candidate.player.avatar_url
      )
      .filter((url): url is string => url !== null);
    if (urls.length > 0) void Image.prefetch(urls);
  }, [items, index]);

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
    setTopFace(0);

    const direction = choice === 'like' ? ('like' as const) : ('pass' as const);
    track(session.user.id, 'swipe', { direction, kind: item.kind });
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
      setTopFace(0);
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
      const when =
        g.session_weekday !== null && g.session_slot !== null
          ? `${WEEKDAY_LABELS[g.session_weekday]} ${SLOT_LABELS[g.session_slot].toLowerCase()}`
          : 'horario por definir';
      return (
        <CardShell
          imageUrl={g.image_url}
          fallbackEmoji="🎲"
          accessibilityLabel={`Mesa ${g.name}. ${g.systems?.name ?? 'Sistema sin definir'}, ${FORMAT_LABELS[g.format]}, ${when}. Coincidís ${item.result.overlapHours} horas.${g.full ? ' Mesa completa, puedes pedir sitio.' : ''}`}
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
            {g.full && <CardChip label="🈵 Completa · pide sitio" />}
          </CardChipRow>
          <CardHint />
          <CardBlurb>
            {g.description && (
              <Text style={cardText.blurb} numberOfLines={2}>
                {g.description}
              </Text>
            )}
            <Text style={cardText.compat}>
              {g.session_weekday !== null && g.session_slot !== null
                ? `📅 ${WEEKDAY_LABELS[g.session_weekday]} ${SLOT_LABELS[
                    g.session_slot
                  ].toLowerCase()} · coincidís ${item.result.overlapHours} h`
                : `📅 Horario por definir · coincidís ${item.result.overlapHours} h`}
            </Text>
          </CardBlurb>
        </CardShell>
      );
    }

    const c = item.candidate;
    const publicLooking = c.player.characters.filter(
      (ch) => ch.status === 'looking' && ch.is_public
    );
    const playerLevel = levelFromXp(c.player.xpTotal);
    const playerAge = ageFromBirthYear(c.player.birth_year);
    const playerGender = c.player.gender ? GENDER_LABELS[c.player.gender as Gender] : null;
    const playerFace = (
      <CardShell
        imageUrl={c.player.avatar_url}
        fallbackEmoji="🧙"
        fallbackColors={['#5865F2', '#8B6CFF']}
        accessibilityLabel={`Jugador ${c.player.alias}${playerAge !== null ? `, ${playerAge} años` : ''}. Candidato para tu mesa ${item.forGroup.name}. Nivel ${playerLevel}. Coincide ${c.result.overlapHours} horas con vuestra sesión.${c.likedGroup ? ' Le gusta vuestra mesa.' : ''}`}
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
          {playerAge !== null ? `, ${playerAge}` : ''}
        </Text>
        <CardChipRow>
          {/* a qué mesa iría: es LO primero que hay que saber antes del like */}
          <CardChip variant="green" label={`🎲 Para «${item.forGroup.name}»`} />
          <CardChip label={ROLE_LABELS[c.player.role] ?? c.player.role} />
          {playerGender && <CardChip label={playerGender} />}
          <CardChip label={`⚔️ Nv. ${playerLevel} · ${titleForLevel(playerLevel)}`} />
        </CardChipRow>
        <CardHint />
        <CardBlurb>
          {c.player.bio && (
            <Text style={cardText.blurb} numberOfLines={2}>
              {c.player.bio}
            </Text>
          )}
          <Text style={cardText.compat}>
            ⏱ Coincide {c.result.overlapHours} h con vuestra sesión
          </Text>
          <Text style={cardText.soft}>
            🛡️ Candidato para «{item.forGroup.name}»
            {publicLooking.length > 0 ? ' · toca para ver sus personajes' : ''}
          </Text>
        </CardBlurb>
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
          {ch.gender && <CardChip label={GENDER_LABELS[ch.gender as Gender]} />}
          {ch.age && <CardChip label={characterAgeLabel(ch.age)!} />}
        </CardChipRow>
        {ch.concept && (
          <Text style={styles.characterConcept} numberOfLines={2}>
            {ch.concept}
          </Text>
        )}
      </CardShell>
    ));
    return <CardCycle faces={[playerFace, ...characterFaces]} onFaceChange={setTopFace} />;
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
          <Text style={sheetText.label}>Quién dirige</Text>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/players/[id]', params: { id: g.owner_id } })
            }>
            <Text style={sheetText.body}>
              🧙 {g.owner.alias} · Nv. {g.owner.level}
              {g.owner.reliability && g.owner.reliability.count > 0
                ? ` · 🎲 ${g.owner.reliability.average.toFixed(1)}/5 (${g.owner.reliability.count})`
                : ''}
              {'  '}
              <Text style={styles.profileLink}>ver perfil ›</Text>
            </Text>
          </Pressable>
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
    // esperamos a saber si toca tutorial para no mandarlo dos veces de ruta
    if (tutorialPending === undefined) return null;
    return (
      <Redirect href={tutorialPending ? '/tutorial?siguiente=onboarding' : '/onboarding'} />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          extra={
            <>
              {/* refresco manual: sin esto solo refrescaba al volver con el
                  feed viejo (>2 min) — «acabo de crear mi mesa, mírala» */}
              <Pressable
                accessibilityLabel="Actualizar el feed"
                onPress={reload}
                style={({ pressed }) => pressed && styles.bellPressed}>
                <Text style={styles.refreshGlyph}>↻</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Novedades"
                onPress={() => router.push('/novedades')}
                style={({ pressed }) => pressed && styles.bellPressed}>
                <Text style={styles.bell}>🔔</Text>
                {hasNews && <View style={styles.bellDot} />}
              </Pressable>
            </>
          }
        />

        {loadError ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>📡</Text>
            <ThemedText style={styles.centerText}>No se pudo cargar el feed.</ThemedText>
            <Pressable style={styles.retryButton} onPress={reload}>
              <ThemedText>Reintentar</ThemedText>
            </Pressable>
            {loadErrorDetail && (
              <Text style={styles.errorDetail} selectable>
                {loadErrorDetail}
              </Text>
            )}
          </View>
        ) : items === undefined || onboarded === undefined ? (
          // silueta de tarjeta, no rueda: misma caja que el deck real
          <View style={styles.deckArea}>
            <CardSkeleton />
          </View>
        ) : !current ? (
          <View style={styles.centerBox}>
            <Text style={styles.centerEmoji}>🃏</Text>
            <ThemedText style={styles.centerText}>
              {emptyReason.headline}
            </ThemedText>
            {emptyReason.hint && (
              <ThemedText type="small" style={styles.centerText} themeColor="textSecondary">
                {emptyReason.hint}
              </ThemedText>
            )}
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                if (!session) return;
                // borra solo los «pass»: lo descartado vuelve a la baraja
                resetPasses(session.user.id).then(reload).catch(reload);
              }}>
              <Text style={styles.retryLabel}>🔄 Volver a barajar los pases</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/onboarding')}>
              <ThemedText type="small" style={styles.emptyAction}>
                {emptyReason.action}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/groups/new')}>
              <ThemedText type="small" style={styles.emptyAction}>
                🛡️ Crear mi propia mesa
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
                renderDetails={(item) => {
                  // con una cara de personaje a la vista, la tira enseña SU hoja
                  if (item.kind === 'player' && topFace > 0) {
                    const showcased = item.candidate.player.characters.filter(
                      (ch) => ch.status === 'looking' && ch.is_public
                    )[topFace - 1];
                    if (showcased) {
                      return (
                        <DetailsFace title={showcased.name}>
                          <CharacterSheetView character={showcased} />
                        </DetailsFace>
                      );
                    }
                  }
                  return (
                    <DetailsFace
                      title={item.kind === 'group' ? item.group.name : item.candidate.player.alias}>
                      {detailsFor(item)}
                    </DetailsFace>
                  );
                }}
                onSwiped={handleSwiped}
                deckRef={deckRef}
              />
            </View>

            {/* La botonera monta sobre el borde inferior de la tarjeta (Tinder) */}
            <View style={styles.actionOverlap}>
              <ActionBar
                onPass={() => deckRef.current?.swipe('pass')}
                onLike={() => deckRef.current?.swipe('like')}
                onInfo={() => deckRef.current?.toggleDetails()}
                onRewind={handleRewind}
              />
            </View>

            {/* Franja bajo el mazo, de alto FIJO: si cambiara entre tipos de
                tarjeta, la nueva pegaría un bump al promocionarse (nos pasó).
                Con mesa y personajes propios lleva la tira de proponer; en el
                resto de casos, el distintivo de qué estás viendo. */}
            <View style={styles.stripSlot}>
              {current.kind === 'group' && myCharacters.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
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
              ) : (
                <View style={styles.kindBadge}>
                  <Text style={styles.kindBadgeText} numberOfLines={1}>
                    {current.kind === 'group'
                      ? '🎲 Mesa buscando jugadores'
                      : `🧙 Jugador — candidato para «${current.forGroup.name}»`}
                  </Text>
                </View>
              )}
            </View>
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
            ? `A «${matchWith.group.name}» también le interesas. ${DISCORD_ENABLED ? 'El bot os está abriendo un canal en Discord.' : 'Ya podéis hablar en el chat de la mesa.'}`
            : matchWith
              ? `${matchWith.candidate.player.alias} también quiere jugar en «${matchWith.forGroup.name}». ${DISCORD_ENABLED ? 'El bot os está abriendo un canal en Discord.' : 'Ya podéis hablar en el chat de la mesa.'}`
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
    // tarjeta más ancha: come casi todo el padding lateral del safeArea
    marginHorizontal: -(Spacing.three - 6),
  },
  actionOverlap: {
    marginTop: -34,
    zIndex: 2,
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
  errorDetail: {
    color: Rolder.textTertiary,
    fontSize: 11,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
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
  bell: {
    fontSize: 20,
  },
  refreshGlyph: {
    color: Rolder.violetSoft,
    fontSize: 24,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
    marginTop: -2,
  },
  bellPressed: {
    opacity: 0.6,
  },
  // mismo lenguaje que el punto de no-leídos del avatar (app-header)
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Rolder.coral,
    borderWidth: 2,
    borderColor: Rolder.page,
  },
  emptyAction: {
    color: Rolder.violetSoft,
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
  // alto fijo: aquí viven la tira de proponer O el distintivo de tipo, y el
  // deck no cambia de tamaño al alternar entre mesas y jugadores
  stripSlot: {
    height: 44,
    marginTop: Spacing.two,
    justifyContent: 'center',
  },
  kindBadge: {
    alignSelf: 'center',
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    maxWidth: '92%',
  },
  kindBadgeText: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
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
