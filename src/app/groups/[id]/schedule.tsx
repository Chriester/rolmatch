// Organizar partida: el hub de agenda de la mesa, accesible desde el chat
// y el perfil de mesa. Próximas sesiones, creación directa con calendario
// (GM) y votaciones de días/franjas (cualquier miembro propone, todos
// multivotan, el GM programa la ganadora).

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { CalendarPicker } from '@/components/calendar-picker';
import { Chip } from '@/components/chip';
import { ThemedView } from '@/components/themed-view';
import { OutlineButton, PrimaryButton, ScreenBlurb, ScreenTitle, SectionLabel } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { showAlert } from '@/lib/alert';
import { SLOT_LABELS, fetchGroup, type GroupDetail } from '@/lib/groups';
import { closePoll, createPoll, fetchPolls, setVote, type SessionPoll } from '@/lib/polls';
import {
  SLOT_START_HOUR,
  createSession,
  deleteSession,
  fetchUpcomingSessions,
  formatSessionDate,
  type GameSession,
} from '@/lib/sessions';

/** clave AAAA-MM-DD + franja → Date local a la hora de inicio de la franja */
function slotDate(key: string, slot: number): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, SLOT_START_HOUR[slot], 0, 0, 0);
}

export default function ScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [polls, setPolls] = useState<SessionPoll[] | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // creación directa (GM)
  const [createDays, setCreateDays] = useState<Set<string>>(new Set());
  const [createSlot, setCreateSlot] = useState(2);

  // nueva votación (cualquier miembro)
  const [pollMode, setPollMode] = useState(false);
  const [pollDays, setPollDays] = useState<Set<string>>(new Set());
  const [pollSlots, setPollSlots] = useState<Set<number>>(new Set([2]));

  const load = useCallback(() => {
    if (!id || !session) return;
    fetchGroup(id).then(setGroup).catch(() => {});
    fetchUpcomingSessions(id).then(setSessions).catch(() => {});
    fetchPolls(id, session.user.id).then(setPolls).catch(() => setPolls([]));
  }, [id, session]);

  useFocusEffect(load);

  const isOwner = group !== null && session?.user.id === group.owner_id;

  const handleCreateSession = async () => {
    if (!id || !session || createDays.size === 0) return;
    setBusy(true);
    try {
      for (const key of [...createDays].sort()) {
        await createSession(id, session.user.id, slotDate(key, createSlot), null);
      }
      setCreateDays(new Set());
      load();
    } catch (error) {
      showAlert('No se pudo programar', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!id || !session || pollDays.size === 0 || pollSlots.size === 0) return;
    const options: Date[] = [];
    for (const key of [...pollDays].sort()) {
      for (const slot of [...pollSlots].sort()) {
        options.push(slotDate(key, slot));
      }
    }
    if (options.length > 12) {
      showAlert('Demasiadas opciones', 'Máximo 12 combinaciones de día y franja por votación.');
      return;
    }
    setBusy(true);
    try {
      await createPoll(id, session.user.id, null, options);
      setPollMode(false);
      setPollDays(new Set());
      setPollSlots(new Set([2]));
      load();
    } catch (error) {
      showAlert('No se pudo crear', error instanceof Error ? error.message : String(error));
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

  const handleSchedule = async (option: { starts_at: string }, poll: SessionPoll) => {
    if (!id || !session) return;
    setBusy(true);
    try {
      await createSession(id, session.user.id, new Date(option.starts_at), null);
      await closePoll(poll.id);
      load();
      showAlert('📅 Sesión programada', 'La ganadora ya está en el calendario de la mesa.');
    } catch (error) {
      showAlert('No se pudo programar', error instanceof Error ? error.message : String(error));
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

          <SectionLabel>Próximas sesiones</SectionLabel>
          {sessions.length === 0 ? (
            <Text style={styles.soft}>Ninguna programada todavía.</Text>
          ) : (
            sessions.map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <Text style={styles.sessionDate}>{formatSessionDate(s.starts_at)}</Text>
                {isOwner && (
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
                )}
              </View>
            ))
          )}

          {openPolls.length > 0 && <SectionLabel>Votaciones abiertas</SectionLabel>}
          {openPolls.map((poll) => {
            const top = Math.max(...poll.options.map((o) => o.votes), 1);
            return (
              <View key={poll.id} style={styles.pollBox}>
                <Text style={styles.pollTitle}>
                  🗳️ ¿Cuándo jugamos? · {poll.options.length} opciones
                </Text>
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
                    {isOwner && option.votes > 0 && (
                      <Pressable onPress={() => handleSchedule(option, poll)} disabled={busy}>
                        <Text style={styles.scheduleLink}>📌 Programar esta</Text>
                      </Pressable>
                    )}
                  </Pressable>
                ))}
                {(isOwner || poll.created_by === session?.user.id) && (
                  <Pressable onPress={() => closePoll(poll.id).then(load)}>
                    <Text style={styles.deleteLink}>Cerrar votación</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {!pollMode ? (
            <OutlineButton
              label="🗳️ Proponer días a votación"
              onPress={() => setPollMode(true)}
            />
          ) : (
            <View style={styles.formBlock}>
              <SectionLabel>Días propuestos</SectionLabel>
              <CalendarPicker
                selected={pollDays}
                onToggle={(key) =>
                  setPollDays((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
              />
              <SectionLabel>Franjas</SectionLabel>
              <View style={styles.chipRow}>
                {SLOT_LABELS.map((label, slot) => (
                  <Chip
                    key={label}
                    label={label}
                    selected={pollSlots.has(slot)}
                    onPress={() =>
                      setPollSlots((prev) => {
                        const next = new Set(prev);
                        if (next.has(slot)) next.delete(slot);
                        else next.add(slot);
                        return next;
                      })
                    }
                  />
                ))}
              </View>
              <View style={styles.nav}>
                <OutlineButton
                  label="Cancelar"
                  tone="white"
                  onPress={() => setPollMode(false)}
                  style={styles.navSmall}
                />
                <PrimaryButton
                  label={busy ? 'Creando…' : 'Abrir votación'}
                  onPress={handleCreatePoll}
                  disabled={busy || pollDays.size === 0 || pollSlots.size === 0}
                  style={styles.navBig}
                />
              </View>
            </View>
          )}

          {isOwner && (
            <View style={styles.formBlock}>
              <SectionLabel>Programar directamente (GM)</SectionLabel>
              <CalendarPicker
                selected={createDays}
                onToggle={(key) =>
                  setCreateDays((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
              />
              <View style={styles.chipRow}>
                {SLOT_LABELS.map((label, slot) => (
                  <Chip
                    key={label}
                    label={label}
                    selected={createSlot === slot}
                    onPress={() => setCreateSlot(slot)}
                  />
                ))}
              </View>
              <PrimaryButton
                label={
                  busy
                    ? 'Programando…'
                    : `📅 Programar ${createDays.size > 1 ? `${createDays.size} sesiones` : 'sesión'}`
                }
                onPress={handleCreateSession}
                disabled={busy || createDays.size === 0}
              />
            </View>
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
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sessionDate: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deleteLink: {
    color: Rolder.pass,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
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
  formBlock: {
    gap: Spacing.two,
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
