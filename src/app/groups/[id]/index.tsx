import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
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
  removeGroupMember,
  type GroupDetail,
} from '@/lib/groups';
import { fetchGroupMatches, matchChannelUrl, type GroupMatch } from '@/lib/matches';
import { boostGroup, isBoostActive } from '@/lib/premium';
import {
  SESSION_CONFIRM_QUORUM,
  SESSION_XP,
  confirmSession,
  createSession,
  deleteSession,
  fetchRecentSessions,
  fetchSessionConfirmations,
  fetchUpcomingSessions,
  nextRegularSession,
  parseSessionDateTime,
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

function toInputs(date: Date): { date: string; time: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}


export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [group, setGroup] = useState<GroupDetail | null | undefined>(undefined);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [confirmations, setConfirmations] = useState<Map<string, SessionConfirmState>>(new Map());
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [sessionBusy, setSessionBusy] = useState(false);
  const [boostedUntil, setBoostedUntil] = useState<string | null>(null);
  const [boostBusy, setBoostBusy] = useState(false);

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
        setGroup(g);
        setBoostedUntil(g.boosted_until);
      })
      .catch(() => setGroup(null));
    fetchUpcomingSessions(id)
      .then(setSessions)
      .catch(() => {});
  }, [id]);

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

  const handleCreateSession = async () => {
    if (!id || !session || !group) return;
    const startsAt = parseSessionDateTime(dateText, timeText);
    if (!startsAt) {
      showAlert('Fecha no válida', 'Usa el formato AAAA-MM-DD y HH:MM, con fecha futura.');
      return;
    }
    setSessionBusy(true);
    try {
      const created = await createSession(id, session.user.id, startsAt, null);
      setSessions((list) =>
        [...list, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      );
      setDateText('');
      setTimeText('');
    } catch (error) {
      showAlert('No se pudo programar', error instanceof Error ? error.message : String(error));
    } finally {
      setSessionBusy(false);
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

  const openSeats = group.group_openings
    .filter((o) => o.is_open)
    .reduce((total, o) => total + o.seats, 0);

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
          </View>

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
                <View key={`hole-${i}`} style={styles.seat}>
                  <View style={[styles.seatAvatar, styles.seatHole]}>
                    <Text style={styles.seatHolePlus}>+</Text>
                  </View>
                  <Text style={styles.seatName}>Libre</Text>
                </View>
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
                      {url ? (
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

              {session?.user.id === group.owner_id && (
                <View style={styles.sessionForm}>
                  <TextInput
                    style={[styles.sessionInput, styles.sessionDate]}
                    value={dateText}
                    onChangeText={setDateText}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#888"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={[styles.sessionInput, styles.sessionTime]}
                    value={timeText}
                    onChangeText={setTimeText}
                    placeholder="HH:MM"
                    placeholderTextColor="#888"
                    autoCapitalize="none"
                  />
                  <Pressable
                    style={[styles.smallButton, sessionBusy && styles.disabled]}
                    onPress={handleCreateSession}
                    disabled={sessionBusy}>
                    <ThemedText type="small" style={styles.primaryLabel}>
                      Programar
                    </ThemedText>
                  </Pressable>
                  {nextRegularSession(group.session_weekday, group.session_slot) && (
                    <Pressable
                      onPress={() => {
                        const next = nextRegularSession(
                          group.session_weekday,
                          group.session_slot
                        )!;
                        const inputs = toInputs(next);
                        setDateText(inputs.date);
                        setTimeText(inputs.time);
                      }}>
                      <ThemedText type="small" style={styles.rateLink}>
                        Usar horario habitual
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {session?.user.id === group.owner_id && (
            <>
              <PrimaryButton
                label="⚔ Ver candidatos"
                onPress={() =>
                  router.push({ pathname: '/groups/[id]/candidates', params: { id: group.id } })
                }
              />
              <OutlineButton
                label="✏️ Editar mesa"
                onPress={() =>
                  router.push({ pathname: '/groups/[id]/edit', params: { id: group.id } })
                }
              />
            </>
          )}

          {group.group_members.some((m) => m.user_id === session?.user.id) && (
            <Pressable
              style={({ pressed }) => pressed && styles.chatPressed}
              onPress={() =>
                router.push({ pathname: '/groups/[id]/chat', params: { id: group.id } })
              }>
              <LinearGradient
                colors={[Rolder.violet, Rolder.discord]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chatButton}>
                <Text style={styles.chatLabel}>💬 Chat de la mesa</Text>
              </LinearGradient>
            </Pressable>
          )}

          {group.group_members.some((m) => m.user_id === session?.user.id) && (
            <OutlineButton
              label="📖 Histórico de la mesa"
              onPress={() =>
                router.push({ pathname: '/groups/[id]/journal', params: { id: group.id } })
              }
            />
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

          {group.discord_invite_url && (
            <DiscordButton
              label="🔗 Servidor de Discord"
              onPress={() => Linking.openURL(group.discord_invite_url!)}
            />
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
  sessionForm: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  sessionInput: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    color: '#888',
  },
  sessionDate: {
    width: 118,
  },
  sessionTime: {
    width: 70,
  },
  smallButton: {
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignSelf: 'flex-start',
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  chatButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  chatPressed: {
    opacity: 0.85,
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
  boostDisabled: {
    opacity: 0.5,
  },
});
