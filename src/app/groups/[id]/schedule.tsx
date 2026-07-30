// Organizar partida v2: el GM propone fechas concretas desde UN calendario
// (hora global + ajuste individual), les pone nombre y elige entre abrir
// votación (con cierre opcional) o fijarlas directamente. Los jugadores
// votan y pueden proponer una fecha extra que cae en la bandeja del GM.

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { CalendarPicker } from '@/components/calendar-picker';
import { Chip } from '@/components/chip';
import { TimeField, type TimeValue } from '@/components/time-field';
import { ThemedView } from '@/components/themed-view';
import { OutlineButton, PrimaryButton, ScreenBlurb, ScreenTitle, SectionLabel } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { showAlert } from '@/lib/alert';
import { fetchGroup, type GroupDetail } from '@/lib/groups';
import {
  closePoll,
  createPoll,
  fetchPolls,
  proposeDate,
  resolveProposal,
  setVote,
  type PollProposal,
  type SessionPoll,
} from '@/lib/polls';
import {
  createSession,
  deleteSession,
  fetchRsvps,
  fetchUpcomingSessions,
  formatSessionDate,
  setRsvp,
  updateSession,
  type GameSession,
  type SessionRsvps,
} from '@/lib/sessions';

const DEFAULT_TIME: TimeValue = { hour: 21, minute: 0 };

const DEADLINES: { label: string; hours: number | null }[] = [
  { label: 'Sin cierre', hours: null },
  { label: '24 h', hours: 24 },
  { label: '48 h', hours: 48 },
  { label: '72 h', hours: 72 },
  { label: '1 semana', hours: 168 },
];

/** clave AAAA-MM-DD + hora elegida → Date local */
function dateAt(key: string, time: TimeValue): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, time.hour, time.minute, 0, 0);
}

function shortDate(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function ScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [rsvps, setRsvps] = useState<Map<string, SessionRsvps>>(new Map());
  const [polls, setPolls] = useState<SessionPoll[] | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // composer del GM
  const [composing, setComposing] = useState(false);
  const [days, setDays] = useState<Set<string>>(new Set());
  const [globalTime, setGlobalTime] = useState<TimeValue>(DEFAULT_TIME);
  const [timeByDay, setTimeByDay] = useState<Map<string, TimeValue>>(new Map());
  const [pollName, setPollName] = useState('');
  const [deadlineHours, setDeadlineHours] = useState<number | null>(48);

  // edición de una sesión ya fijada (GM)
  const [editingSession, setEditingSession] = useState<GameSession | null>(null);
  const [editDay, setEditDay] = useState<string | null>(null);
  const [editTime, setEditTime] = useState<TimeValue>(DEFAULT_TIME);
  const [editTitle, setEditTitle] = useState('');

  // propuesta extra de un jugador
  const [proposingFor, setProposingFor] = useState<string | null>(null);
  const [proposalDay, setProposalDay] = useState<string | null>(null);
  const [proposalTime, setProposalTime] = useState<TimeValue>(DEFAULT_TIME);

  const load = useCallback(() => {
    if (!id || !session) return;
    const viewerId = session.user.id;
    fetchGroup(id).then(setGroup).catch(() => {});
    fetchUpcomingSessions(id)
      .then((list) => {
        setSessions(list);
        fetchRsvps(list.map((s) => s.id), viewerId).then(setRsvps);
      })
      .catch(() => {});
    fetchPolls(id, viewerId).then(setPolls).catch(() => setPolls([]));
  }, [id, session]);

  useFocusEffect(load);

  const isOwner = group !== null && session?.user.id === group.owner_id;

  const timeFor = (key: string): TimeValue => timeByDay.get(key) ?? globalTime;
  const composerDates = () => [...days].sort().map((key) => dateAt(key, timeFor(key)));

  const resetComposer = () => {
    setComposing(false);
    setDays(new Set());
    setTimeByDay(new Map());
    setPollName('');
    setDeadlineHours(48);
  };

  const handleStartPoll = async () => {
    if (!id || !session || days.size === 0) return;
    setBusy(true);
    try {
      const closesAt =
        deadlineHours === null ? null : new Date(Date.now() + deadlineHours * 3600_000);
      await createPoll(id, session.user.id, pollName.trim() || null, composerDates(), closesAt);
      resetComposer();
      load();
    } catch (error) {
      showAlert('No se pudo crear', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleFixDirect = async () => {
    if (!id || !session || days.size === 0) return;
    setBusy(true);
    try {
      for (const date of composerDates()) {
        await createSession(id, session.user.id, date, pollName.trim() || null);
      }
      resetComposer();
      load();
      showAlert('📅 Fechas fijadas', 'Ya están en el calendario de la mesa.');
    } catch (error) {
      showAlert('No se pudo fijar', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleVote = async (poll: SessionPoll, optionId: string, next: boolean) => {
    if (!session) return;
    // pintado optimista: el voto se nota al instante
    setPolls((list) =>
      list?.map((p) =>
        p.id === poll.id
          ? {
              ...p,
              options: p.options.map((o) =>
                o.id === optionId
                  ? { ...o, mine: next, votes: o.votes + (next ? 1 : -1) }
                  : o
              ),
            }
          : p
      )
    );
    try {
      await setVote(optionId, session.user.id, next);
    } catch {
      load();
    }
  };

  const handlePickWinner = async (option: { starts_at: string }, poll: SessionPoll) => {
    if (!id || !session) return;
    setBusy(true);
    try {
      await createSession(id, session.user.id, new Date(option.starts_at), poll.title);
      await closePoll(poll.id);
      load();
      showAlert('📅 Partida fijada', 'La votación queda cerrada y la fecha, en el calendario.');
    } catch (error) {
      showAlert('No se pudo fijar', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const openSessionEditor = (s: GameSession) => {
    const date = new Date(s.starts_at);
    const pad = (n: number) => String(n).padStart(2, '0');
    setEditingSession(s);
    setEditDay(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
    setEditTime({ hour: date.getHours(), minute: date.getMinutes() - (date.getMinutes() % 15) });
    setEditTitle(s.title ?? '');
  };

  const handleSaveSessionEdit = async () => {
    if (!editingSession || !editDay) return;
    setBusy(true);
    try {
      await updateSession(editingSession.id, dateAt(editDay, editTime), editTitle.trim() || null);
      setEditingSession(null);
      load();
      showAlert('📅 Sesión actualizada', 'Los recordatorios se reprograman con la hora nueva.');
    } catch (error) {
      showAlert('No se pudo actualizar', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  // ✋ voy / 🙅 no voy — toque en el mismo estado lo quita
  const handleRsvp = async (gameSession: GameSession, status: 'yes' | 'no') => {
    if (!session) return;
    const current = rsvps.get(gameSession.id) ?? { yes: [], no: [], mine: null };
    const next = current.mine === status ? null : status;
    try {
      await setRsvp(gameSession.id, session.user.id, next);
      load();
    } catch (error) {
      showAlert('No se pudo marcar', error instanceof Error ? error.message : String(error));
    }
  };

  const handleSendProposal = async (poll: SessionPoll) => {
    if (!session || !proposalDay) return;
    setBusy(true);
    try {
      await proposeDate(poll.id, session.user.id, dateAt(proposalDay, proposalTime));
      setProposingFor(null);
      setProposalDay(null);
      load();
      showAlert('🙋 Propuesta enviada', 'El GM decidirá si la añade a la votación.');
    } catch (error) {
      showAlert('No se pudo proponer', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleResolveProposal = async (proposal: PollProposal, accept: boolean) => {
    setBusy(true);
    try {
      await resolveProposal(proposal, accept);
      load();
    } catch (error) {
      showAlert('No se pudo resolver', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  if (!group || polls === undefined) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const openPolls = polls.filter((p) => p.status === 'open');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader
            onBack={() =>
              router.canGoBack()
                ? router.back()
                : router.replace({ pathname: '/groups/[id]', params: { id: id! } })
            }
          />
          <ScreenTitle>📅 Organizar partida</ScreenTitle>
          <ScreenBlurb>«{group.name}»</ScreenBlurb>

          <SectionLabel>Próximas partidas</SectionLabel>
          {sessions.length === 0 ? (
            <Text style={styles.soft}>Ninguna fijada todavía.</Text>
          ) : (
            sessions.map((s) => {
              const rsvp = rsvps.get(s.id) ?? { yes: [], no: [], mine: null };
              return (
                <View key={s.id} style={styles.sessionCard}>
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionBody}>
                      <Text style={styles.sessionDate}>{formatSessionDate(s.starts_at)}</Text>
                      {s.title && <Text style={styles.sessionTitle}>{s.title}</Text>}
                    </View>
                    {isOwner && (
                      <View style={styles.sessionActions}>
                        <Pressable onPress={() => openSessionEditor(s)}>
                          <Text style={styles.editLink}>✏️ Editar</Text>
                        </Pressable>
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
                          <Text style={styles.deleteLink}>Quitar</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  {editingSession?.id === s.id && (
                    <View style={styles.formBlock}>
                      <CalendarPicker
                        selected={editDay ? new Set([editDay]) : new Set()}
                        onToggle={(key) => setEditDay(key)}
                      />
                      <View style={styles.timeRow}>
                        <Text style={styles.timeLabel}>Hora</Text>
                        <TimeField value={editTime} onChange={setEditTime} />
                      </View>
                      <TextInput
                        style={styles.nameInput}
                        value={editTitle}
                        onChangeText={setEditTitle}
                        placeholder="Nombre (opcional)"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        maxLength={120}
                      />
                      <View style={styles.nav}>
                        <OutlineButton
                          label="Cancelar"
                          tone="white"
                          onPress={() => setEditingSession(null)}
                          style={styles.navSmall}
                        />
                        <PrimaryButton
                          label={busy ? 'Guardando…' : '💾 Guardar'}
                          onPress={handleSaveSessionEdit}
                          disabled={busy || !editDay}
                          style={styles.navBig}
                        />
                      </View>
                    </View>
                  )}
                  <View style={styles.rsvpRow}>
                    <Pressable
                      style={[styles.rsvpButton, rsvp.mine === 'yes' && styles.rsvpYesActive]}
                      onPress={() => handleRsvp(s, 'yes')}>
                      <Text style={styles.rsvpLabel}>✋ Voy{rsvp.yes.length > 0 ? ` · ${rsvp.yes.length}` : ''}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.rsvpButton, rsvp.mine === 'no' && styles.rsvpNoActive]}
                      onPress={() => handleRsvp(s, 'no')}>
                      <Text style={styles.rsvpLabel}>🙅 No voy{rsvp.no.length > 0 ? ` · ${rsvp.no.length}` : ''}</Text>
                    </Pressable>
                  </View>
                  {(rsvp.yes.length > 0 || rsvp.no.length > 0) && (
                    <Text style={styles.rsvpNames} numberOfLines={2}>
                      {rsvp.yes.length > 0 ? `Van: ${rsvp.yes.join(', ')}` : ''}
                      {rsvp.yes.length > 0 && rsvp.no.length > 0 ? ' · ' : ''}
                      {rsvp.no.length > 0 ? `No van: ${rsvp.no.join(', ')}` : ''}
                    </Text>
                  )}
                </View>
              );
            })
          )}

          {openPolls.length > 0 && <SectionLabel>Votaciones abiertas</SectionLabel>}
          {openPolls.map((poll) => {
            const top = Math.max(...poll.options.map((o) => o.votes), 1);
            const pending = poll.proposals.filter((p) => p.status === 'pending');
            const mineProposals = poll.proposals.filter(
              (p) => p.proposer_id === session?.user.id
            );
            return (
              <View key={poll.id} style={styles.pollBox}>
                <Text style={styles.pollTitle}>
                  🗳️ {poll.title ?? '¿Cuándo jugamos?'} · {poll.options.length} opciones
                </Text>
                {poll.closes_at && (
                  <Text style={styles.pollDeadline}>
                    ⏳ Cierra el {formatSessionDate(poll.closes_at)}
                  </Text>
                )}

                {poll.options.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[styles.option, option.mine && styles.optionMine]}
                    onPress={() => handleVote(poll, option.id, !option.mine)}>
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionLabel}>
                        {option.mine ? '✅ ' : ''}
                        {formatSessionDate(option.starts_at)}
                      </Text>
                      <Text style={styles.optionVotes}>{option.votes} 🎲</Text>
                    </View>
                    <View style={styles.voteTrack}>
                      <View
                        style={[styles.voteFill, { width: `${(option.votes / top) * 100}%` }]}
                      />
                    </View>
                    {isOwner && (
                      <Pressable onPress={() => handlePickWinner(option, poll)} disabled={busy}>
                        <Text style={styles.scheduleLink}>📌 Elegir esta y cerrar</Text>
                      </Pressable>
                    )}
                  </Pressable>
                ))}

                {/* bandeja del GM: fechas extra propuestas por jugadores */}
                {isOwner && pending.length > 0 && (
                  <View style={styles.proposalBox}>
                    <Text style={styles.proposalTitle}>🙋 Fechas propuestas por la mesa</Text>
                    {pending.map((proposal) => (
                      <View key={proposal.id} style={styles.proposalRow}>
                        <Text style={styles.proposalLabel} numberOfLines={2}>
                          {proposal.proposer_alias}: {formatSessionDate(proposal.starts_at)}
                        </Text>
                        <Pressable
                          onPress={() => handleResolveProposal(proposal, true)}
                          disabled={busy}>
                          <Text style={styles.acceptLink}>➕ Añadir</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleResolveProposal(proposal, false)}
                          disabled={busy}>
                          <Text style={styles.deleteLink}>Rechazar</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* jugador: proponer una fecha extra */}
                {!isOwner && (
                  <>
                    {mineProposals.map((proposal) => (
                      <Text key={proposal.id} style={styles.soft}>
                        {proposal.status === 'pending'
                          ? `🙋 Tu propuesta (${formatSessionDate(proposal.starts_at)}) espera al GM.`
                          : proposal.status === 'accepted'
                            ? `✅ Tu propuesta (${formatSessionDate(proposal.starts_at)}) está en la votación.`
                            : `Tu propuesta (${formatSessionDate(proposal.starts_at)}) no entró esta vez.`}
                      </Text>
                    ))}
                    {proposingFor === poll.id ? (
                      <View style={styles.formBlock}>
                        <SectionLabel>Tu fecha propuesta</SectionLabel>
                        <CalendarPicker
                          selected={proposalDay ? new Set([proposalDay]) : new Set()}
                          onToggle={(key) =>
                            setProposalDay((prev) => (prev === key ? null : key))
                          }
                        />
                        <View style={styles.timeRow}>
                          <Text style={styles.timeLabel}>Hora</Text>
                          <TimeField value={proposalTime} onChange={setProposalTime} />
                        </View>
                        <View style={styles.nav}>
                          <OutlineButton
                            label="Cancelar"
                            tone="white"
                            onPress={() => setProposingFor(null)}
                            style={styles.navSmall}
                          />
                          <PrimaryButton
                            label={busy ? 'Enviando…' : 'Enviar al GM'}
                            onPress={() => handleSendProposal(poll)}
                            disabled={busy || !proposalDay}
                            style={styles.navBig}
                          />
                        </View>
                      </View>
                    ) : (
                      <OutlineButton
                        label="➕ Proponer otra fecha"
                        onPress={() => {
                          setProposingFor(poll.id);
                          setProposalDay(null);
                        }}
                      />
                    )}
                  </>
                )}

                {isOwner && (
                  <Pressable onPress={() => closePoll(poll.id).then(load)}>
                    <Text style={styles.deleteLink}>Cerrar sin fijar fecha</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* composer del GM: un solo calendario para votación o fijado directo */}
          {isOwner &&
            (!composing ? (
              <PrimaryButton
                label="📅 Proponer fechas de partida"
                onPress={() => setComposing(true)}
              />
            ) : (
              <View style={styles.formBlock}>
                <SectionLabel>Fechas propuestas</SectionLabel>
                <CalendarPicker
                  selected={days}
                  onToggle={(key) =>
                    setDays((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                />

                {days.size > 0 && (
                  <>
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>Hora para todas</Text>
                      <TimeField
                        value={globalTime}
                        onChange={(t) => {
                          setGlobalTime(t);
                          setTimeByDay(new Map()); // la global resetea los ajustes
                        }}
                      />
                    </View>
                    {[...days].sort().map((key) => (
                      <View key={key} style={styles.dayRow}>
                        <Text style={styles.dayLabel}>{shortDate(key)}</Text>
                        <TimeField
                          compact
                          value={timeFor(key)}
                          onChange={(t) =>
                            setTimeByDay((prev) => new Map(prev).set(key, t))
                          }
                        />
                      </View>
                    ))}

                    <SectionLabel>Nombre (opcional)</SectionLabel>
                    <TextInput
                      style={styles.nameInput}
                      value={pollName}
                      onChangeText={setPollName}
                      placeholder="Sesión 12, one-shot de Halloween…"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      maxLength={120}
                    />

                    <SectionLabel>La votación cierra en</SectionLabel>
                    <View style={styles.chipRow}>
                      {DEADLINES.map((d) => (
                        <Chip
                          key={d.label}
                          label={d.label}
                          selected={deadlineHours === d.hours}
                          onPress={() => setDeadlineHours(d.hours)}
                        />
                      ))}
                    </View>
                  </>
                )}

                <View style={styles.nav}>
                  <OutlineButton
                    label="Cancelar"
                    tone="white"
                    onPress={resetComposer}
                    style={styles.navSmall}
                  />
                  <PrimaryButton
                    label={busy ? 'Creando…' : '🗳️ Empezar votación'}
                    onPress={handleStartPoll}
                    disabled={busy || days.size === 0}
                    style={styles.navBig}
                  />
                </View>
                <OutlineButton
                  label={
                    days.size > 1
                      ? `📌 Fijar las ${days.size} sin votación`
                      : '📌 Fijar sin votación'
                  }
                  onPress={handleFixDirect}
                  disabled={busy || days.size === 0}
                />
              </View>
            ))}

          {!isOwner && openPolls.length === 0 && (
            <Text style={styles.soft}>
              El GM aún no ha propuesto fechas. Cuando abra una votación aparecerá aquí y en el
              chat.
            </Text>
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
    width: '100%',
  },
  scroll: {
    padding: 20,
    gap: Spacing.three,
  },
  soft: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
  },
  sessionCard: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rsvpYesActive: {
    backgroundColor: 'rgba(59,209,111,0.15)',
    borderColor: 'rgba(59,209,111,0.7)',
  },
  rsvpNoActive: {
    backgroundColor: 'rgba(255,90,95,0.12)',
    borderColor: 'rgba(255,90,95,0.6)',
  },
  rsvpLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  rsvpNames: {
    color: Rolder.textSecondary,
    fontSize: 11.5,
    fontFamily: RolderFonts.regular,
  },
  sessionBody: {
    flex: 1,
    gap: 2,
  },
  sessionDate: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sessionTitle: {
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
  },
  deleteLink: {
    color: Rolder.pass,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  editLink: {
    color: Rolder.violetSoft,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
  },
  acceptLink: {
    color: Rolder.likeChipText,
    fontSize: 12.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  pollBox: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.35)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  pollTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  pollDeadline: {
    color: Rolder.textSecondary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
  },
  option: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  optionMine: {
    borderColor: 'rgba(139,108,255,0.8)',
    backgroundColor: 'rgba(139,108,255,0.12)',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  optionVotes: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  voteTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  voteFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Rolder.violet,
  },
  scheduleLink: {
    color: Rolder.likeChipText,
    fontSize: 12.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  proposalBox: {
    backgroundColor: 'rgba(139,108,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.3)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  proposalTitle: {
    color: Rolder.violetSofter,
    fontSize: 12.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  proposalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proposalLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  formBlock: {
    gap: Spacing.two,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 10,
  },
  dayLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    textTransform: 'capitalize',
  },
  nameInput: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  nav: {
    flexDirection: 'row',
    gap: 10,
  },
  navSmall: {
    flex: 1,
  },
  navBig: {
    flex: 2,
  },
});
