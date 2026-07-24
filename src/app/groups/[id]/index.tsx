import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

function styleLabel(value: number, left: string, right: string) {
  if (value <= 25) return left;
  if (value >= 75) return right;
  return 'Equilibrado';
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [group, setGroup] = useState<GroupDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    fetchGroup(id)
      .then(setGroup)
      .catch(() => setGroup(null));
  }, [id]);

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
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/groups'))}>
            <ThemedText type="link">← Volver</ThemedText>
          </Pressable>

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
            {group.group_members.map((member) => (
              <ThemedText key={member.user_id}>
                {member.profiles?.alias ?? 'Sin alias'}
                {member.member_role === 'gm' ? ' · GM' : ''}
              </ThemedText>
            ))}
          </View>

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
