import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { pendingApplicants } from '@/lib/activity';
import { confirmAction, humanizeError, showAlert } from '@/lib/alert';
import { track } from '@/lib/analytics';
import { fetchMyChats } from '@/lib/messages';
import { supabase } from '@/lib/supabase';
import { APP_URL, DISCORD_ENABLED } from '@/lib/config';
import { AppHeader } from '@/components/app-header';
import { AvatarStack } from '@/components/avatar-stack';
import { PublicGroupInvite } from '@/components/public-group-invite';
import { TableTabs, type TableTabKey } from '@/components/table-tabs';
import { GroupChatPanel } from './chat';
import { GroupSchedulePanel } from './schedule';
import { GroupJournalPanel } from './journal';
import { CardChip, CardChipRow } from '@/components/swipe/card-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DiscordButton, OutlineButton, PrimaryButton, SectionLabel, StyleBar } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  EXPERIENCE_LABELS,
  FORMAT_LABELS,
  SLOT_LABELS,
  VTT_LABELS,
  WEEKDAY_LABELS,
  archiveGroup,
  confirmGroupAlive,
  fetchGroup,
  fetchGroupVitality,
  freeSeats,
  removeGroupMember,
  reopenGroup,
  transferGroup,
  type GroupDetail,
  type GroupVitality,
} from '@/lib/groups';
import { fetchGroupMatches, matchChannelUrl, type GroupMatch } from '@/lib/matches';
import { boostGroup, isBoostActive } from '@/lib/premium';
import { warmGroupTabs } from '@/lib/prefetch';
import { hasCompletedOnboarding } from '@/lib/profile';
import { cacheGet, cacheSet } from '@/lib/screen-cache';
import { fetchRatedSince } from '@/lib/ratings';
import { shareLink } from '@/lib/share';
import { fetchMySwipeOnGroup, swipeOnGroup, undoSwipeOnGroup } from '@/lib/swipes';
import {
  SESSION_CONFIRM_QUORUM,
  SESSION_XP,
  confirmSession,
  deleteSession,
  fetchRecentSessions,
  fetchSessionConfirmations,
  fetchUpcomingSessions,
  type GameSession,
  type SessionConfirmState,
} from '@/lib/sessions';

// El hero del hub: grande en la pestaña Mesa, compacto (solo el nombre) en
// las demás — la cabecera nunca se va, solo cede sitio.
const HERO_FULL = 210;
const HERO_MINI = 64;

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}


/**
 * Esta ruta vive FUERA del bloque protegido: es el destino de los enlaces
 * compartidos y quien llega sin cuenta tiene que poder ver de qué va la mesa
 * antes de registrarse. Sin sesión se pinta la ficha pública (migr. 00046);
 * con ella, la pantalla completa de siempre. Son dos componentes distintos a
 * propósito: la de abajo asume sesión en media docena de hooks.
 */
export default function GroupDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();

  if (session === undefined) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  if (session === null) return <PublicGroupInvite groupId={id} />;
  return <GroupDetailScreen />;
}

function GroupDetailScreen() {
  const { id, invitacion, tab: tabParam } = useLocalSearchParams<{
    id: string;
    invitacion?: string;
    tab?: string;
  }>();
  const session = useSession();
  // arranca con lo último visto (comparte caché con el chat de la mesa)
  const [group, setGroup] = useState<GroupDetail | null | undefined>(() =>
    id ? cacheGet(`group:${id}`) : undefined
  );
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [confirmations, setConfirmations] = useState<Map<string, SessionConfirmState>>(new Map());
  const [ratedSince, setRatedSince] = useState<Set<string>>(new Set());
  const [boostedUntil, setBoostedUntil] = useState<string | null>(null);
  const [boostBusy, setBoostBusy] = useState(false);
  /** abierta la lista de miembros para elegir nuevo GM */
  const [transferOpen, setTransferOpen] = useState(false);
  /** plazas en detalle (grid con echar/valorar/invitar por asiento) */
  const [seatsDetail, setSeatsDetail] = useState(false);

  // ——— El hub es UNA página: la pestaña es estado, no navegación ———
  // El tab mostrado se DERIVA en render (sin setState en efectos): el deep
  // link (?tab=chat) manda hasta que el usuario toca otra pestaña; si llega
  // un param nuevo, vuelve a mandar el param.
  const paramTab: TableTabKey =
    tabParam === 'chat' || tabParam === 'agenda' || tabParam === 'diario' ? tabParam : 'mesa';
  const [tabOverride, setTabOverride] = useState<{ param: string | undefined; tab: TableTabKey } | null>(
    null
  );
  // sin plaza en la mesa las pestañas están bloqueadas: mande lo que mande
  // el param, un visitante siempre ve Mesa
  const lockedView =
    group != null &&
    session != null &&
    group.owner_id !== session.user.id &&
    !group.group_members.some((m) => m.user_id === session.user.id);
  const tab: TableTabKey = lockedView
    ? 'mesa'
    : tabOverride && tabOverride.param === tabParam
      ? tabOverride.tab
      : paramTab;
  const selectTab = (next: TableTabKey) => setTabOverride({ param: tabParam, tab: next });

  // El hero encoge al salir de la pestaña Mesa: misma cabecera, más sitio.
  const heroH = useSharedValue(tab === 'mesa' ? HERO_FULL : HERO_MINI);
  useEffect(() => {
     
    heroH.value = withTiming(tab === 'mesa' ? HERO_FULL : HERO_MINI, { duration: 240 });
  }, [tab, heroH]);
  const heroAnimStyle = useAnimatedStyle(() => ({ height: heroH.value }));
  const heroDetailStyle = useAnimatedStyle(() => ({
    opacity: interpolate(heroH.value, [HERO_MINI, HERO_FULL], [0, 1], Extrapolation.CLAMP),
    // compacto: los chips no solo se desvanecen — dejan de ocupar sitio;
    // invisibles pero con altura empujaban el nombre fuera de la banda
    maxHeight: interpolate(heroH.value, [HERO_MINI, HERO_FULL], [0, 80], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));
  /** aviso de inactividad (migr. 00052): null = sin aviso o sin migración */
  const [vitality, setVitality] = useState<GroupVitality | null>(null);
  const [aliveBusy, setAliveBusy] = useState(false);
  /** badge de la pestaña Chat (miembros) */
  const [chatUnread, setChatUnread] = useState(0);
  /** solicitudes pendientes (solo GM): la bandeja destacada del hub */
  const [applicantsCount, setApplicantsCount] = useState(0);
  // «pedir sitio» para quien llega sin ser miembro (p. ej. enlace compartido)
  const [mySwipe, setMySwipe] = useState<'like' | 'pass' | null | undefined>(undefined);
  const [applyBusy, setApplyBusy] = useState(false);

  const handleApply = async () => {
    if (!id || !session || applyBusy) return;
    setApplyBusy(true);
    try {
      // si antes hizo pass (en el feed), lo deshacemos y pedimos sitio
      if (mySwipe === 'pass') await undoSwipeOnGroup(session.user.id, id);
      await swipeOnGroup(session.user.id, id, 'like');
      setMySwipe('like');
      // el match ya solo lo cierra el GM al aceptar en Candidatos (00040)
      showAlert('🙋 Sitio pedido', 'El GM verá tu solicitud y decidirá. Te avisamos si entras.');
    } catch (error) {
      showAlert('No se pudo pedir sitio', humanizeError(error));
    } finally {
      setApplyBusy(false);
    }
  };

  const handleShare = async (name: string) => {
    if (!id) return;
    const via = await shareLink({
      title: `«${name}» en rolder`,
      text: `Únete a mi mesa «${name}» en rolder 🎲`,
      url: `${APP_URL}/groups/${id}?invitacion=1`,
    });
    if (!via) return;
    if (via === 'clipboard')
      showAlert('🔗 Enlace copiado', 'Pégalo donde quieras para invitar gente a la mesa.');
    track(session?.user.id, 'share_group_link', { via });
  };

  const handleBoost = async () => {
    if (!id) return;
    setBoostBusy(true);
    try {
      const until = await boostGroup(id);
      setBoostedUntil(until);
      showAlert('🚀 Mesa destacada', 'Aparecerá primero en los feeds durante 7 días.');
    } catch (error) {
      const message = humanizeError(error);
      if (message.includes('premium')) {
        showAlert(
          '🚀 Destacar es premium',
          'Los testers de la alpha tienen premium incluido — pídeselo a Chris.'
        );
      } else {
        showAlert('No se pudo destacar', message);
      }
    } finally {
      setBoostBusy(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchGroup(id)
      .then((g) => {
        cacheSet(`group:${id}`, g);
        setGroup(g);
        setBoostedUntil(g.boosted_until);
      })
      .catch(() => setGroup((current) => current ?? null));
    fetchUpcomingSessions(id)
      .then((list) => {
        cacheSet(`group-sessions:${id}`, list);
        setSessions(list);
      })
      .catch(() => {});
    fetchGroupVitality(id)
      .then(setVitality)
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id || !session) return;
    fetchMySwipeOnGroup(session.user.id, id)
      .then(setMySwipe)
      .catch(() => setMySwipe(null));
  }, [id, session]);

  // Con el hub recién abierto se precalientan las otras pestañas en segundo
  // plano: cambiar a chat, agenda o diario no enseña la rueda ni la primera
  // vez. Solo con plaza en la mesa (a un visitante la RLS le daría vacío).
  const viewerHasSeat = group != null && session != null && !lockedView;
  const viewerIdForWarm = session?.user.id ?? null;
  useEffect(() => {
    if (!id || !viewerIdForWarm || !viewerHasSeat) return;
    warmGroupTabs(id, viewerIdForWarm);
  }, [id, viewerIdForWarm, viewerHasSeat]);

  // Invitación por enlace con perfil sin completar: primero el onboarding;
  // guardamos esta ruta para reanudar la solicitud al terminar el perfil.
  useEffect(() => {
    if (!session || !invitacion) return;
    hasCompletedOnboarding(session.user.id)
      .then((done) => {
        if (done) return;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          localStorage.setItem(
            'rolder-ruta-pendiente',
            window.location.pathname + window.location.search
          );
        }
        router.replace('/onboarding');
      })
      .catch(() => {});
  }, [session, invitacion]);

  useEffect(() => {
    if (!id || !session) return;
    const viewerId = session.user.id;
    fetchRecentSessions(id)
      .then(async (recent) => {
        setRecentSessions(recent);
        setConfirmations(
          await fetchSessionConfirmations(
            recent.map((s) => s.id),
            viewerId
          )
        );
      })
      .catch(() => {});
  }, [id, session]);

  // Quién me falta por valorar de la última partida. Se relee al volver a la
  // pantalla (p. ej. justo después de valorar a alguien), no solo al montar.
  const lastPlayedAt = recentSessions[0]?.starts_at ?? null;
  const viewerId = session?.user.id ?? null;
  useFocusEffect(
    useCallback(() => {
      if (!id || !viewerId || !lastPlayedAt) return;
      fetchRatedSince(viewerId, id, lastPlayedAt)
        .then(setRatedSince)
        .catch(() => {});
    }, [id, viewerId, lastPlayedAt])
  );

  useEffect(() => {
    if (!id || !session || group?.owner_id !== session.user.id) return;
    fetchGroupMatches(id)
      .then(setMatches)
      .catch(() => setMatches([]));
    // solicitudes pendientes: likes de jugador sin decisión del GM ni plaza
    Promise.all([
      supabase
        .from('swipes')
        .select('user_id, group_id, created_at')
        .eq('group_id', id)
        .eq('origin', 'user')
        .eq('direction', 'like'),
      supabase.from('swipes').select('user_id, group_id').eq('group_id', id).eq('origin', 'group'),
      supabase.from('group_members').select('user_id, group_id').eq('group_id', id),
    ])
      .then(([likes, decided, roster]) => {
        const resolved = new Set(
          [...(decided.data ?? []), ...(roster.data ?? [])].map(
            (r) => `${r.group_id}:${r.user_id}`
          )
        );
        setApplicantsCount(pendingApplicants(likes.data ?? [], resolved).get(id)?.count ?? 0);
      })
      .catch(() => {});
  }, [id, session, group?.owner_id]);

  // badge del chat en las pestañas del hub (solo con plaza en la mesa);
  // se recalcula al cambiar de pestaña — al salir del chat ya está leído
  useEffect(() => {
    if (!id || !session) return;
    fetchMyChats(session.user.id)
      .then((chats) => setChatUnread(chats.find((c) => c.groupId === id)?.unread ?? 0))
      .catch(() => {});
  }, [id, session, tab]);
  const handleConfirmSession = async (s: GameSession) => {
    if (!session) return;
    try {
      await confirmSession(s.id, session.user.id);
      setConfirmations((map) => {
        const next = new Map(map);
        const prev = next.get(s.id) ?? { count: 0, mine: false };
        next.set(s.id, { count: prev.count + 1, mine: true });
        return next;
      });
    } catch (error) {
      showAlert(
        'No se pudo confirmar',
        humanizeError(error)
      );
    }
  };

  if (group === undefined) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (group === null) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ThemedText>No se pudo cargar la mesa.</ThemedText>
      </ThemedView>
    );
  }

  // plazas libres derivadas del límite y los miembros reales
  const openSeats = freeSeats(group);

  const isOwner = session?.user.id === group.owner_id;
  const isMember = group.group_members.some((m) => m.user_id === session?.user.id);
  const isMemberOrOwner = isMember || isOwner;

  // Última partida jugada y a quién me falta valorar de ella. La fiabilidad
  // solo se llena si se pide en caliente; escondida en un enlace de la lista
  // de plazas no la usaba nadie.
  const lastPlayed = recentSessions[0] ?? null;
  const pendingToRate =
    isMember && lastPlayed
      ? group.group_members.filter(
          (m) => m.user_id !== session?.user.id && !ratedSince.has(m.user_id)
        )
      : [];

  const schedule =
    group.session_weekday !== null && group.session_slot !== null
      ? `${WEEKDAY_LABELS[group.session_weekday]} · ${SLOT_LABELS[group.session_slot]}`
      : 'Horario por definir';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Zona fija del hub: cabecera de app, hero (que encoge fuera de
            Mesa) y pestañas. El contenido de cada pestaña carga DEBAJO —
            nunca sales de la página de la mesa. */}
        <View style={styles.fixedTop}>
          <AppHeader
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/groups'))}
          />

          <Animated.View style={[styles.hero, heroAnimStyle]}>
            {group.image_url ? (
              <Image
                source={{ uri: group.image_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={['#4A55E2', '#8B6CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.heroFallback]}>
                <Text style={styles.heroEmoji}>🎲</Text>
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(10,10,18,0.55)', 'rgba(10,10,18,0.94)']}
              style={styles.heroGradient}
            />
            <View style={styles.heroInfo}>
              <Text style={styles.heroName} numberOfLines={tab === 'mesa' ? 2 : 1}>
                {group.name}
              </Text>
              {/* los chips y los fabs se desvanecen con el hero compacto */}
              <Animated.View
                style={heroDetailStyle}
                pointerEvents={tab === 'mesa' ? 'auto' : 'none'}>
                <CardChipRow>
                  <CardChip label={group.systems?.name ?? 'Sistema sin definir'} />
                  <CardChip label={FORMAT_LABELS[group.format]} />
                  {group.frequency && <CardChip label={group.frequency} />}
                  {openSeats > 0 && (
                    <CardChip
                      variant="green"
                      label={`${openSeats} ${openSeats === 1 ? 'plaza libre' : 'plazas libres'}`}
                    />
                  )}
                </CardChipRow>
              </Animated.View>
            </View>
            <Animated.View
              style={[styles.heroFabs, heroDetailStyle]}
              pointerEvents={tab === 'mesa' ? 'auto' : 'none'}>
              <Pressable
                style={styles.heroFab}
                accessibilityLabel="Compartir mesa"
                onPress={() => handleShare(group.name)}>
                <Text style={styles.heroFabIcon}>🔗</Text>
              </Pressable>
              {isOwner && (
                <Pressable
                  style={styles.heroFab}
                  accessibilityLabel="Editar mesa"
                  onPress={() =>
                    router.push({ pathname: '/groups/[id]/edit', params: { id: group.id } })
                  }>
                  <Text style={styles.heroFabIcon}>✏️</Text>
                </Pressable>
              )}
            </Animated.View>
          </Animated.View>

          {/* El hub (entregable §1): pestañas con etiqueta en vez de círculos
              mudos. El visitante las ve con candado — el candado vende. */}
          {session && (
            <TableTabs
              active={tab}
              onSelect={selectTab}
              unread={chatUnread}
              locked={!isMember && !isOwner}
            />
          )}
          {session && !isMember && !isOwner && (
            <Text style={styles.lockedNote}>
              Chat, agenda y diario se desbloquean cuando el GM te acepte.
            </Text>
          )}
        </View>

        {tab === 'chat' && <GroupChatPanel id={group.id} />}
        {tab === 'agenda' && <GroupSchedulePanel id={group.id} />}
        {tab === 'diario' && (
          <GroupJournalPanel id={group.id} onGoAgenda={() => selectTab('agenda')} />
        )}
        {tab === 'mesa' && (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Mesa parada (migr. 00052): el cron avisó y, sin señales de vida
              en 7 días, la archiva. El GM la rescata con un toque. */}
          {isOwner && group.is_active && vitality?.warnedAt && (
            <View style={styles.vitalityBanner}>
              <Text style={styles.vitalityTitle}>⏳ ¿Seguís jugando?</Text>
              <Text style={styles.vitalityBody}>
                La mesa lleva parada desde el{' '}
                {new Date(vitality.lastActivityAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                })}
                . Si nadie da señales, se archivará sola y dejará de salir en el feed.
              </Text>
              <OutlineButton
                label={aliveBusy ? 'Confirmando…' : '🔄 ¡Seguimos jugando!'}
                disabled={aliveBusy}
                onPress={async () => {
                  setAliveBusy(true);
                  try {
                    await confirmGroupAlive(group.id);
                    setVitality((v) => (v ? { ...v, warnedAt: null } : v));
                  } catch (error) {
                    showAlert(
                      'No se pudo confirmar',
                      error instanceof Error ? error.message : String(error)
                    );
                  } finally {
                    setAliveBusy(false);
                  }
                }}
              />
            </View>
          )}

          {isOwner && !group.is_active && (
            <View style={styles.vitalityBanner}>
              <Text style={styles.vitalityTitle}>💤 Mesa archivada</Text>
              <Text style={styles.vitalityBody}>
                No sale en el feed ni recibe candidatos. Todo lo demás (chat, diario, miembros)
                sigue intacto.
              </Text>
              <OutlineButton
                label={aliveBusy ? 'Reabriendo…' : '☀️ Reabrir mesa'}
                disabled={aliveBusy}
                onPress={async () => {
                  setAliveBusy(true);
                  try {
                    await reopenGroup(group.id);
                    setGroup((g) => (g ? { ...g, is_active: true } : g));
                  } catch (error) {
                    showAlert(
                      'No se pudo reabrir',
                      error instanceof Error ? error.message : String(error)
                    );
                  } finally {
                    setAliveBusy(false);
                  }
                }}
              />
            </View>
          )}

          {/* Quién dirige (2a): la decisión de pedir sitio se apoya en el GM */}
          {session &&
            !isMember &&
            !isOwner &&
            (() => {
              const gm = group.group_members.find((m) => m.user_id === group.owner_id);
              if (!gm) return null;
              return (
                <Pressable
                  accessibilityLabel={`Ver el perfil del GM ${gm.profiles?.alias ?? ''}`}
                  style={({ pressed }) => [styles.gmRow, pressed && styles.actionPressed]}
                  onPress={() =>
                    router.push({ pathname: '/players/[id]', params: { id: gm.user_id } })
                  }>
                  {gm.profiles?.avatar_url ? (
                    <Image source={{ uri: gm.profiles.avatar_url }} style={styles.gmAvatar} />
                  ) : (
                    <View style={[styles.gmAvatar, styles.gmAvatarFallback]}>
                      <Text>🧙‍♂️</Text>
                    </View>
                  )}
                  <View style={styles.gmBody}>
                    <Text style={styles.gmName} numberOfLines={1}>
                      Dirige {gm.profiles?.alias ?? 'Sin alias'}
                    </Text>
                    <Text style={styles.gmHint}>Ver su perfil ›</Text>
                  </View>
                </Pressable>
              );
            })()}

          {/* Candidatos como bandeja destacada, no icono escondido (1a) */}
          {isOwner && applicantsCount > 0 && (
            <Pressable
              accessibilityLabel={`${applicantsCount} candidatos piden sitio`}
              style={({ pressed }) => [styles.candidatesCard, pressed && styles.actionPressed]}
              onPress={() =>
                router.push({ pathname: '/groups/[id]/candidates', params: { id: group.id } })
              }>
              <Text style={styles.candidatesText} numberOfLines={1}>
                ⚔️{' '}
                {applicantsCount === 1
                  ? '1 aventurero pide sitio'
                  : `${applicantsCount} aventureros piden sitio`}
              </Text>
              <Text style={styles.candidatesChevron}>›</Text>
            </Pressable>
          )}

          {/* Próxima partida a la vista sin ir a la agenda (1a) */}
          {isMemberOrOwner && sessions[0] && (
            <Pressable
              accessibilityLabel="Próxima partida"
              style={({ pressed }) => [styles.nextSession, pressed && styles.actionPressed]}
              onPress={() =>
                router.replace({ pathname: '/groups/[id]/schedule', params: { id: group.id } })
              }>
              <Text style={styles.nextSessionIcon}>📅</Text>
              <View style={styles.nextSessionBody}>
                <Text style={styles.nextSessionTitle} numberOfLines={1}>
                  Próxima partida: {formatSessionDate(sessions[0].starts_at)}
                </Text>
                {confirmations.get(sessions[0].id) && (
                  <Text style={styles.nextSessionMeta}>
                    {confirmations.get(sessions[0].id)!.count} de {group.group_members.length}{' '}
                    confirmados
                    {confirmations.get(sessions[0].id)!.mine ? ' · tú ya estás 💪' : ''}
                  </Text>
                )}
              </View>
              <Text style={styles.candidatesChevron}>Ver</Text>
            </Pressable>
          )}

          {/* visitante (p. ej. enlace compartido): pedir sitio desde aquí mismo */}
          {invitacion && session && !isMember && !isOwner && (
            <View style={styles.inviteBanner}>
              <Text style={styles.inviteText}>
                💌 Te han invitado a esta mesa. Échale un vistazo y, si te encaja,
                pide sitio: el GM recibirá tu solicitud.
              </Text>
            </View>
          )}
          {session && !isMember && !isOwner && (
            mySwipe === 'like' ? (
              <Text style={styles.appliedNote}>
                🙋 Ya has pedido sitio — el GM decidirá y te avisamos.
              </Text>
            ) : (
              <PrimaryButton
                label={applyBusy ? 'Enviando…' : '🙋 Pedir sitio en esta mesa'}
                onPress={handleApply}
                disabled={applyBusy || mySwipe === undefined}
              />
            )
          )}

          {lastPlayed && pendingToRate.length > 0 && (
            <View style={styles.rateBox}>
              <Text style={styles.rateBoxTitle}>🎲 ¿Qué tal la partida?</Text>
              <Text style={styles.rateBoxHelp}>
                {formatSessionDate(lastPlayed.starts_at)} · valora a quien jugó contigo. Es lo
                que construye la fiabilidad que ve el resto.
              </Text>
              <View style={styles.rateChips}>
                {pendingToRate.map((member) => (
                  <Pressable
                    key={member.user_id}
                    style={styles.rateChip}
                    accessibilityLabel={`Valorar a ${member.profiles?.alias ?? 'este miembro'}`}
                    onPress={() =>
                      router.push({
                        pathname: '/rate',
                        params: {
                          userId: member.user_id,
                          alias: member.profiles?.alias ?? '',
                          groupId: group.id,
                        },
                      })
                    }>
                    <Text style={styles.rateChipText}>
                      {member.profiles?.alias ?? 'Sin alias'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {group.description && (
            <View style={styles.block}>
              <SectionLabel>Sobre la mesa</SectionLabel>
              <Text style={styles.body}>{group.description}</Text>
            </View>
          )}

          <View style={styles.block}>
            <SectionLabel>Horario</SectionLabel>
            <Text style={styles.body}>
              {schedule} ({group.timezone})
              {group.frequency ? ` · ${group.frequency.toLowerCase()}` : ''}
            </Text>
          </View>

          <View style={styles.block}>
            <SectionLabel>Plazas</SectionLabel>
            {/* Compacto por defecto (entregable §3): pila de avatares con el
                GM en oro y un solo Invitar. Lo operativo por asiento (echar,
                valorar, invitar hueco a hueco — #134) vive en «ver detalle». */}
            {!seatsDetail && (
              <>
                <View style={styles.stackRow}>
                  <AvatarStack
                    people={group.group_members.map((m) => ({
                      id: m.user_id,
                      alias: m.profiles?.alias ?? null,
                      avatarUrl: m.profiles?.avatar_url ?? null,
                      isGm: m.user_id === group.owner_id,
                    }))}
                    freeSeats={openSeats}
                    onPressPerson={(person) =>
                      router.push({ pathname: '/players/[id]', params: { id: person.id } })
                    }
                  />
                  <Text style={styles.stackMeta}>
                    {openSeats > 0
                      ? `quedan ${openSeats} de ${group.max_players}`
                      : 'mesa completa'}
                  </Text>
                </View>
                <View style={styles.stackActions}>
                  <OutlineButton
                    label="🔗 Invitar"
                    style={styles.stackButton}
                    onPress={() => handleShare(group.name)}
                  />
                  {isMemberOrOwner && (
                    <OutlineButton
                      label="Ver detalle"
                      tone="white"
                      style={styles.stackButton}
                      onPress={() => setSeatsDetail(true)}
                    />
                  )}
                </View>
              </>
            )}
            {seatsDetail && (
              <Pressable onPress={() => setSeatsDetail(false)} accessibilityLabel="Plegar plazas">
                <Text style={styles.stackCollapse}>▲ Plegar detalle</Text>
              </Pressable>
            )}
            {seatsDetail && (
            <View style={styles.seatsRow}>
              {group.group_members.map((member) => {
                const isMe = member.user_id === session?.user.id;
                const iAmMember = group.group_members.some(
                  (m) => m.user_id === session?.user.id
                );
                const isGm = member.member_role === 'gm';
                return (
                  <Pressable
                    key={member.user_id}
                    style={styles.seat}
                    accessibilityLabel={`Ver perfil de ${member.profiles?.alias ?? 'miembro'}`}
                    onPress={() =>
                      router.push({ pathname: '/players/[id]', params: { id: member.user_id } })
                    }>
                    {member.profiles?.avatar_url ? (
                      <Image
                        source={{ uri: member.profiles.avatar_url }}
                        style={[styles.seatAvatar, isGm && styles.seatAvatarGm]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.seatAvatar,
                          styles.seatAvatarFallback,
                          isGm && styles.seatAvatarGm,
                        ]}>
                        <Text style={styles.seatEmoji}>{isGm ? '🧙‍♂️' : '🧝'}</Text>
                      </View>
                    )}
                    <Text style={styles.seatName} numberOfLines={1}>
                      {member.profiles?.alias ?? 'Sin alias'}
                      {isGm ? ' · GM' : ''}
                    </Text>
                    {iAmMember && !isMe && (
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: '/rate',
                            params: {
                              userId: member.user_id,
                              alias: member.profiles?.alias ?? '',
                              groupId: group.id,
                            },
                          })
                        }>
                        <Text style={styles.rateHint}>🎲 valorar</Text>
                      </Pressable>
                    )}
                    {session?.user.id === group.owner_id && !isGm && (
                      <Pressable
                        onPress={async () => {
                          const alias = member.profiles?.alias ?? 'este miembro';
                          const ok = await confirmAction(
                            `¿Echar a ${alias}?`,
                            'Saldrá de la mesa y del chat. Podrá volver si hacéis match de nuevo.',
                            'Sí, echar'
                          );
                          if (!ok) return;
                          try {
                            await removeGroupMember(group.id, member.user_id);
                            setGroup((g) =>
                              g
                                ? {
                                    ...g,
                                    group_members: g.group_members.filter(
                                      (m) => m.user_id !== member.user_id
                                    ),
                                  }
                                : g
                            );
                          } catch (error) {
                            showAlert(
                              'No se pudo echar',
                              humanizeError(error)
                            );
                          }
                        }}>
                        <Text style={styles.kickHint}>✕ echar</Text>
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
              {Array.from({ length: openSeats }).map((_, i) => (
                <Pressable
                  key={`hole-${i}`}
                  style={styles.seat}
                  accessibilityLabel="Invitar a esta plaza libre"
                  onPress={() => handleShare(group.name)}>
                  <View style={[styles.seatAvatar, styles.seatHole]}>
                    <Text style={styles.seatHolePlus}>+</Text>
                  </View>
                  <Text style={styles.seatName}>Libre</Text>
                  <Text style={styles.rateHint}>🔗 invitar</Text>
                </Pressable>
              ))}
            </View>
            )}
            {group.experience_wanted && (
              <Text style={styles.bodySoft}>
                Busca nivel {EXPERIENCE_LABELS[group.experience_wanted].toLowerCase()}
              </Text>
            )}
          </View>

          <View style={styles.block}>
            <SectionLabel>Estilo de la mesa</SectionLabel>
            <StyleBar left="Combate" right="Narrativo" value={group.style_combat_narrative} />
            <StyleBar left="Serio" right="Humor" value={group.style_serious_humor} />
            <StyleBar
              left="Roleo ligero"
              right="Roleo pesado"
              value={group.style_roleplay_weight}
            />
            <Text style={styles.bodySoft}>{VTT_LABELS[group.vtt]}</Text>
          </View>

          {session?.user.id === group.owner_id && matches.length > 0 && (
            <View style={styles.block}>
              <SectionLabel>Jugadores con match</SectionLabel>
              {matches.map((match) => {
                const url = matchChannelUrl(match);
                return (
                  <Pressable
                    key={match.id}
                    style={styles.matchRow}
                    accessibilityLabel={`Ver perfil de ${match.alias}`}
                    onPress={() =>
                      router.push({ pathname: '/players/[id]', params: { id: match.user_id } })
                    }>
                    {match.avatar_url ? (
                      <Image source={{ uri: match.avatar_url }} style={styles.matchThumb} />
                    ) : (
                      <View style={[styles.matchThumb, styles.matchThumbFallback]}>
                        <ThemedText>🧙</ThemedText>
                      </View>
                    )}
                    <View style={styles.matchBody}>
                      <ThemedText>{match.alias}</ThemedText>
                      {!DISCORD_ENABLED ? null : url ? (
                        <Pressable onPress={() => Linking.openURL(url)}>
                          <ThemedText type="small" style={styles.matchLink}>
                            Abrir canal en Discord
                          </ThemedText>
                        </Pressable>
                      ) : (
                        <ThemedText type="small">El canal se creará en unos segundos…</ThemedText>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {group.group_members.some((m) => m.user_id === session?.user.id) && (
            <View style={styles.block}>
              <SectionLabel>📅 Próximas sesiones</SectionLabel>
              {sessions.length === 0 ? (
                <ThemedText type="small">Ninguna programada todavía.</ThemedText>
              ) : (
                sessions.map((s) => (
                  <View key={s.id} style={styles.memberRow}>
                    <ThemedText style={styles.memberName}>
                      {formatSessionDate(s.starts_at)}
                    </ThemedText>
                    {session?.user.id === group.owner_id && (
                      <Pressable
                        onPress={async () => {
                          const ok = await confirmAction(
                            '¿Cancelar esta partida?',
                            'Se borra del calendario de la mesa y le llega un aviso a cada miembro.',
                            'Sí, cancelar'
                          );
                          if (!ok) return;
                          try {
                            await deleteSession(s.id);
                            setSessions((list) => list.filter((x) => x.id !== s.id));
                          } catch (error) {
                            showAlert(
                              'No se pudo cancelar',
                              humanizeError(error)
                            );
                          }
                        }}>
                        <ThemedText type="small" style={styles.deleteLink}>
                          Cancelar
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                ))
              )}

              {recentSessions.length > 0 && (
                <View style={styles.confirmBlock}>
                  <ThemedText type="small" style={styles.confirmTitle}>
                    🎲 Últimas sesiones — ¿se jugó?
                  </ThemedText>
                  {recentSessions.map((s) => {
                    const state = confirmations.get(s.id) ?? { count: 0, mine: false };
                    const played = state.count >= SESSION_CONFIRM_QUORUM;
                    return (
                      <View key={s.id} style={styles.memberRow}>
                        <ThemedText style={styles.memberName}>
                          {formatSessionDate(s.starts_at)}
                        </ThemedText>
                        {state.mine ? (
                          <ThemedText type="small" style={played ? styles.confirmDone : styles.confirmPending}>
                            {played
                              ? `✅ Jugada · +${SESSION_XP} XP`
                              : `Confirmada ${state.count}/${SESSION_CONFIRM_QUORUM} — faltan ${SESSION_CONFIRM_QUORUM - state.count}`}
                          </ThemedText>
                        ) : (
                          <Pressable onPress={() => handleConfirmSession(s)}>
                            <ThemedText type="small" style={styles.rateLink}>
                              ✅ Confirmar ({state.count}/{SESSION_CONFIRM_QUORUM})
                            </ThemedText>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

            </View>
          )}

          {/* Gestionar mesa (1a): todas las acciones de GM en una sección,
              no repartidas por la pantalla */}
          {isOwner && (
            <View style={styles.block}>
              <SectionLabel>⚙️ Gestionar mesa</SectionLabel>
              <View style={styles.manageGrid}>
                <OutlineButton
                  label="✏️ Editar"
                  style={styles.manageButton}
                  onPress={() =>
                    router.push({ pathname: '/groups/[id]/edit', params: { id: group.id } })
                  }
                />
                {group.group_members.some((m) => m.user_id !== session!.user.id) && (
                  <OutlineButton
                    label={transferOpen ? '✖️ Cancelar' : '👑 Traspasar'}
                    style={styles.manageButton}
                    onPress={() => setTransferOpen((open) => !open)}
                  />
                )}
                {isBoostActive(boostedUntil) ? (
                  <Text style={[styles.boostActive, styles.manageButton]}>
                    🚀 Destacada hasta el{' '}
                    {new Date(boostedUntil!).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                ) : (
                  <OutlineButton
                    label="🚀 Destacar ✦"
                    tone="gold"
                    style={styles.manageButton}
                    onPress={handleBoost}
                    disabled={boostBusy}
                  />
                )}
                {group.is_active && (
                  <OutlineButton
                    label="💤 Archivar"
                    tone="white"
                    style={styles.manageButton}
                    onPress={async () => {
                      const ok = await confirmAction(
                        '¿Archivar la mesa?',
                        'Deja de salir en el feed y de recibir candidatos. Chat, diario y miembros quedan intactos, y puedes reabrirla cuando quieras.',
                        'Sí, archivar'
                      );
                      if (!ok) return;
                      try {
                        await archiveGroup(group.id);
                        setGroup((g) => (g ? { ...g, is_active: false } : g));
                      } catch (error) {
                        showAlert('No se pudo archivar', humanizeError(error));
                      }
                    }}
                  />
                )}
              </View>
              {transferOpen &&
                group.group_members
                  .filter((m) => m.user_id !== session!.user.id)
                  .map((member) => (
                    <Pressable
                      key={member.user_id}
                      style={styles.transferRow}
                      accessibilityLabel={`Traspasar la mesa a ${member.profiles?.alias ?? 'este miembro'}`}
                      onPress={async () => {
                        const alias = member.profiles?.alias ?? 'este miembro';
                        const ok = await confirmAction(
                          `¿Traspasar la mesa a ${alias}?`,
                          'Pasará a ser GM con todos los mandos; tú te quedas dentro como jugador. No se puede deshacer (salvo que te la devuelva).',
                          'Sí, traspasar'
                        );
                        if (!ok) return;
                        try {
                          await transferGroup(group.id, member.user_id);
                          setTransferOpen(false);
                          const fresh = await fetchGroup(group.id);
                          cacheSet(`group:${group.id}`, fresh);
                          setGroup(fresh);
                          showAlert('👑 Mesa traspasada', `${alias} es GM a partir de ahora.`);
                        } catch (error) {
                          showAlert(
                            'No se pudo traspasar',
                            error instanceof Error ? error.message : String(error)
                          );
                        }
                      }}>
                      <Text style={styles.transferAlias}>
                        👤 {member.profiles?.alias ?? 'Sin alias'}
                      </Text>
                      <Text style={styles.transferHint}>Hacer GM ›</Text>
                    </Pressable>
                  ))}
            </View>
          )}

          {session &&
            session.user.id !== group.owner_id &&
            group.group_members.some((m) => m.user_id === session.user.id) && (
              <OutlineButton
                label="🚪 Salir de la mesa"
                tone="red"
                onPress={async () => {
                  const ok = await confirmAction(
                    '¿Salir de la mesa?',
                    'Dejarás de ver su chat, sesiones e histórico. Para volver tendréis que hacer match otra vez.',
                    'Sí, salir'
                  );
                  if (!ok) return;
                  try {
                    await removeGroupMember(group.id, session.user.id);
                    router.replace('/');
                  } catch (error) {
                    showAlert(
                      'No se pudo salir',
                      humanizeError(error)
                    );
                  }
                }}
              />
            )}

          {DISCORD_ENABLED && group.discord_invite_url && (
            <DiscordButton
              label="🔗 Servidor de Discord"
              onPress={() => Linking.openURL(group.discord_invite_url!)}
            />
          )}

          {session && !isOwner && (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/report',
                  params: { kind: 'group', id: group.id, name: group.name },
                })
              }>
              <Text style={styles.reportLink}>Reportar esta mesa</Text>
            </Pressable>
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
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  // cabecera del hub fija: comparte el padding lateral con el scroll
  fixedTop: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: Spacing.three,
  },
  scroll: {
    padding: 20,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  block: {
    gap: 8,
  },
  hero: {
    height: 210,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Rolder.surface,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 64,
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  heroInfo: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    gap: 8,
  },
  heroName: {
    color: '#fff',
    fontSize: 24,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  body: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13.5,
    fontFamily: RolderFonts.regular,
    lineHeight: 19,
  },
  bodySoft: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  seatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  seat: {
    alignItems: 'center',
    gap: 4,
    width: 68,
  },
  seatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  seatAvatarGm: {
    borderWidth: 2,
    borderColor: Rolder.gold,
  },
  seatAvatarFallback: {
    backgroundColor: 'rgba(139,108,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatEmoji: {
    fontSize: 22,
  },
  seatName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: RolderFonts.semibold,
    textAlign: 'center',
  },
  rateHint: {
    color: Rolder.violetSoft,
    fontSize: 10,
    fontFamily: RolderFonts.regular,
  },
  rateBox: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.violet,
    borderRadius: 16,
    padding: 14,
    gap: Spacing.two,
  },
  rateBoxTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  rateBoxHelp: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
    lineHeight: 18,
  },
  rateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  rateChip: {
    backgroundColor: 'rgba(139,108,255,0.18)',
    borderWidth: 1,
    borderColor: Rolder.violetSoft,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rateChipText: {
    color: '#fff',
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  kickHint: {
    color: Rolder.pass,
    fontSize: 10,
    fontFamily: RolderFonts.regular,
  },
  seatHole: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(139,108,255,0.6)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatHolePlus: {
    color: Rolder.violetSoft,
    fontSize: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  memberName: {
    flexShrink: 1,
  },
  rateLink: {
    color: '#5865F2',
  },
  confirmBlock: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  confirmTitle: {
    color: Rolder.textSecondary,
  },
  confirmDone: {
    color: Rolder.likeChipText,
  },
  confirmPending: {
    color: Rolder.textSecondary,
  },
  deleteLink: {
    color: '#d9534f',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOutline: {
    backgroundColor: 'rgba(139,108,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.45)',
  },
  actionIcon: {
    fontSize: 20,
  },
  actionPressed: {
    opacity: 0.7,
  },
  heroFabs: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  heroFab: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(10,10,18,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFabIcon: {
    fontSize: 15,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  matchThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  matchThumbFallback: {
    backgroundColor: 'rgba(88,101,242,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchBody: {
    gap: 2,
  },
  matchLink: {
    color: '#5865F2',
    fontWeight: '600',
  },
  boostButton: {
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignSelf: 'flex-start',
  },
  boostLabel: {
    color: '#F5A623',
    fontWeight: '600',
  },
  boostActive: {
    color: '#F5A623',
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stackMeta: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  stackActions: {
    flexDirection: 'row',
    gap: 8,
  },
  stackButton: {
    flex: 1,
  },
  stackCollapse: {
    color: Rolder.violetSoft,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  lockedNote: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginTop: -6,
  },
  candidatesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(139,108,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.5)',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  candidatesText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
  },
  candidatesChevron: {
    color: Rolder.violetSoft,
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
  },
  nextSession: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  nextSessionIcon: {
    fontSize: 20,
  },
  nextSessionBody: {
    flex: 1,
    gap: 2,
  },
  nextSessionTitle: {
    color: '#fff',
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  nextSessionMeta: {
    color: Rolder.textSecondary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
  },
  gmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    padding: 12,
  },
  gmAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Rolder.gold,
  },
  gmAvatarFallback: {
    backgroundColor: 'rgba(245,166,35,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gmBody: {
    flex: 1,
    gap: 1,
  },
  gmName: {
    color: '#fff',
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  gmHint: {
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
  },
  manageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  manageButton: {
    flexGrow: 1,
    flexBasis: '47%',
  },
  vitalityBanner: {
    backgroundColor: 'rgba(245,166,35,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.4)',
    borderRadius: 16,
    padding: 14,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  vitalityTitle: {
    color: '#F5A623',
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '700',
  },
  vitalityBody: {
    color: Rolder.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  transferAlias: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
  },
  transferHint: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
  },
  reportLink: {
    color: Rolder.pass,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  inviteBanner: {
    backgroundColor: Rolder.violetSofter,
    borderWidth: 1,
    borderColor: Rolder.violetSoft,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  inviteText: {
    color: Rolder.violet,
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    textAlign: 'center',
  },
  appliedNote: {
    color: Rolder.likeChipText,
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    textAlign: 'center',
    paddingVertical: 6,
  },
  boostDisabled: {
    opacity: 0.5,
  },
});
