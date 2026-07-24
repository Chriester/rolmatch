import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  EXPERIENCE_LABELS,
  FORMAT_LABELS,
  SLOT_LABELS,
  VTT_LABELS,
  WEEKDAY_LABELS,
  fetchGroup,
  type GroupDetail,
} from '@/lib/groups';
import {
  createSession,
  deleteSession,
  fetchUpcomingSessions,
  nextRegularSession,
  parseSessionDateTime,
  type GameSession,
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

function styleLabel(value: number, left: string, right: string) {
  if (value <= 25) return left;
  if (value >= 75) return right;
  return 'Equilibrado';
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [group, setGroup] = useState<GroupDetail | null | undefined>(undefined);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [sessionBusy, setSessionBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchGroup(id)
      .then(setGroup)
      .catch(() => setGroup(null));
    fetchUpcomingSessions(id)
      .then(setSessions)
      .catch(() => {});
  }, [id]);

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

          {group.image_url && (
            <Image source={{ uri: group.image_url }} style={styles.headerImage} />
          )}
          <ThemedText type="title">{group.name}</ThemedText>
          <ThemedText>
            {group.systems?.name ?? 'Sistema sin definir'} · {FORMAT_LABELS[group.format]}
            {group.frequency ? ` · ${group.frequency.toLowerCase()}` : ''}
          </ThemedText>
          <ThemedText type="small">
            {schedule} ({group.timezone})
          </ThemedText>

          {group.description && <ThemedText>{group.description}</ThemedText>}

          <View style={styles.block}>
            <ThemedText type="subtitle">Plazas</ThemedText>
            <ThemedText>
              {openSeats > 0
                ? `${openSeats} ${openSeats === 1 ? 'plaza libre' : 'plazas libres'}`
                : 'Mesa completa'}
              {group.experience_wanted
                ? ` · busca nivel: ${EXPERIENCE_LABELS[group.experience_wanted].toLowerCase()}`
                : ''}
            </ThemedText>
          </View>

          <View style={styles.block}>
            <ThemedText type="subtitle">Estilo de la mesa</ThemedText>
            <ThemedText type="small">
              {styleLabel(group.style_combat_narrative, 'Combate', 'Narrativo')} ·{' '}
              {styleLabel(group.style_serious_humor, 'Serio', 'Humor')} ·{' '}
              {styleLabel(group.style_roleplay_weight, 'Roleo ligero', 'Roleo pesado')} ·{' '}
              {VTT_LABELS[group.vtt]}
            </ThemedText>
          </View>

          <View style={styles.block}>
            <ThemedText type="subtitle">Miembros</ThemedText>
            {group.group_members.map((member) => {
              const isMe = member.user_id === session?.user.id;
              const iAmMember = group.group_members.some((m) => m.user_id === session?.user.id);
              return (
                <View key={member.user_id} style={styles.memberRow}>
                  <ThemedText style={styles.memberName}>
                    {member.profiles?.alias ?? 'Sin alias'}
                    {member.member_role === 'gm' ? ' · GM' : ''}
                  </ThemedText>
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
                      <ThemedText type="small" style={styles.rateLink}>
                        🎲 Valorar
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>

          {group.group_members.some((m) => m.user_id === session?.user.id) && (
            <View style={styles.block}>
              <ThemedText type="subtitle">📅 Próximas sesiones</ThemedText>
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
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push({ pathname: '/groups/[id]/candidates', params: { id: group.id } })
              }>
              <ThemedText style={styles.primaryLabel}>Ver candidatos</ThemedText>
            </Pressable>
          )}

          {group.discord_invite_url && (
            <Pressable
              style={styles.primaryButton}
              onPress={() => Linking.openURL(group.discord_invite_url!)}>
              <ThemedText style={styles.primaryLabel}>Discord de la mesa</ThemedText>
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  block: {
    gap: Spacing.one,
  },
  headerImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.two,
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
});
