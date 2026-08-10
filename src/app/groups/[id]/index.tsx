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
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmAction, showAlert } from '@/lib/alert';
import { DISCORD_ENABLED } from '@/lib/config';
import { AppHeader } from '@/components/app-header';
import { PublicGroupInvite } from '@/components/public-group-invite';
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
  fetchGroup,
  freeSeats,
  removeGroupMember,
  type GroupDetail,
} from '@/lib/groups';
import { fetchGroupMatches, matchChannelUrl, type GroupMatch } from '@/lib/matches';
import { boostGroup, isBoostActive } from '@/lib/premium';
import { hasCompletedOnboarding } from '@/lib/profile';
import { cacheGet, cacheSet } from '@/lib/screen-cache';
import { fetchRatedSince } from '@/lib/ratings';
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
  const { id, invitacion } = useLocalSearchParams<{ id: string; invitacion?: string }>();
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
      showAlert('No se pudo pedir sitio', error instanceof Error ? error.message : String(error));
    } finally {
      setApplyBusy(false);
    }
  };

  const handleShare = async (name: string) => {
    if (!id) return;
    const url = `https://rolmatch.vercel.app/groups/${id}?invitacion=1`;
    try {
      if (Platform.OS === 'web') {
        const nav = navigator as { share?: (data: object) => Promise<void>; clipboard?: { writeText: (t: string) => Promise<void> } };
        if (nav.share) {
          // texto SIN la URL: con ella en ambos campos muchos destinos
          // (WhatsApp incluido) pegaban el enlace dos veces
          await nav.share({
            title: `«${name}» en rolder`,
            text: `Únete a mi mesa «${name}» en rolder 🎲`,
            url,
          });
        } else {
          await nav.clipboard?.writeText(url);
          showAlert('🔗 Enlace copiado', 'Pégalo donde quieras para invitar gente a la mesa.');
        }
      } else {
        await Share.share({ message: `Únete a mi mesa «${name}» en rolder 🎲 ${url}` });
      }
    } catch {
      // compartir cancelado por el usuario
    }
  };

  const handleBoost = async () => {
    if (!id) return;
    setBoostBusy(true);
    try {
      const until = await boostGroup(id);
      setBoostedUntil(until);
      showAlert('🚀 Mesa destacada', 'Aparecerá primero en los feeds durante 7 días.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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
      .then(setSessions)
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id || !session) return;
    fetchMySwipeOnGroup(session.user.id, id)
      .then(setMySwipe)
      .catch(() => setMySwipe(null));
  }, [id, session]);

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
  }, [id, session, group?.owner_id]);
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
        error instanceof Error ? error.message : String(error)
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
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/groups'))}
          />

          <View style={styles.hero}>
            {group.image_url ? (
              <Image source={{ uri: group.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
              <Text style={styles.heroName} numberOfLines={2}>
                {group.name}
              </Text>
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
            </View>
            <View style={styles.heroFabs}>
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
            </View>
          </View>

          {isMember && (
            <View style={styles.actionsRow}>
              <Pressable
                accessibilityLabel="Chat de la mesa"
                style={({ pressed }) => pressed && styles.actionPressed}
                onPress={() =>
                  router.push({ pathname: '/groups/[id]/chat', params: { id: group.id } })
                }>
                <LinearGradient
                  colors={[Rolder.violet, Rolder.discord]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButton}>
                  <Text style={styles.actionIcon}>💬</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                accessibilityLabel="Organizar partida"
                style={({ pressed }) => [styles.actionButton, styles.actionOutline, pressed && styles.actionPressed]}
                onPress={() =>
                  router.push({ pathname: '/groups/[id]/schedule', params: { id: group.id } })
                }>
                <Text style={styles.actionIcon}>📅</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Histórico de la mesa"
                style={({ pressed }) => [styles.actionButton, styles.actionOutline, pressed && styles.actionPressed]}
                onPress={() =>
                  router.push({ pathname: '/groups/[id]/journal', params: { id: group.id } })
                }>
                <Text style={styles.actionIcon}>📖</Text>
              </Pressable>
              {isOwner && (
                <Pressable
                  accessibilityLabel="Ver candidatos"
                  style={({ pressed }) => [styles.actionButton, styles.actionOutline, pressed && styles.actionPressed]}
                  onPress={() =>
                    router.push({ pathname: '/groups/[id]/candidates', params: { id: group.id } })
                  }>
                  <Text style={styles.actionIcon}>⚔️</Text>
                </Pressable>
              )}
            </View>
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
                              error instanceof Error ? error.message : String(error)
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
                          try {
                            await deleteSession(s.id);
                            setSessions((list) => list.filter((x) => x.id !== s.id));
                          } catch (error) {
                            showAlert(
                              'No se pudo borrar',
                              error instanceof Error ? error.message : String(error)
                            );
                          }
                        }}>
                        <ThemedText type="small" style={styles.deleteLink}>
                          Quitar
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

          {session?.user.id === group.owner_id &&
            (isBoostActive(boostedUntil) ? (
              <Text style={styles.boostActive}>
                🚀 Mesa destacada hasta el{' '}
                {new Date(boostedUntil!).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            ) : (
              <OutlineButton
                label="🚀 Destacar mesa 7 días (premium)"
                tone="gold"
                onPress={handleBoost}
                disabled={boostBusy}
              />
            ))}

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
                      error instanceof Error ? error.message : String(error)
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
    maxWidth: MaxContentWidth,
  },
  scroll: {
    padding: 20,
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
