// Panel lateral del chat: resumen de la mesa sin salir de la conversación —
// horario, próxima sesión programada y miembros (tap → su perfil).

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, SlideInRight } from 'react-native-reanimated';

import { OutlineButton, SectionLabel } from '@/components/ui';
import { Rolder, RolderFonts } from '@/constants/theme';
import { SLOT_HOURS, SLOT_LABELS, WEEKDAY_LABELS, type GroupDetail } from '@/lib/groups';
import { fetchUpcomingSessions, type GameSession } from '@/lib/sessions';

type ChatInfoPanelProps = {
  visible: boolean;
  group: GroupDetail;
  onClose: () => void;
};

function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatInfoPanel({ visible, group, onClose }: ChatInfoPanelProps) {
  const [sessions, setSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    if (!visible) return;
    fetchUpcomingSessions(group.id)
      .then(setSessions)
      .catch(() => {});
  }, [visible, group.id]);

  if (!visible) return null;

  const schedule =
    group.session_weekday !== null && group.session_slot !== null
      ? `${WEEKDAY_LABELS[group.session_weekday]} · ${SLOT_LABELS[group.session_slot]} (${
          SLOT_HOURS[group.session_slot]
        }, ${group.timezone})`
      : 'Horario por definir';

  const navigate = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(150).reduceMotion(ReduceMotion.Never)}
          style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar panel" />
        </Animated.View>

        <Animated.View
          entering={SlideInRight.duration(220).reduceMotion(ReduceMotion.Never)}
          style={styles.panel}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.name} numberOfLines={2}>
              {group.name}
            </Text>

            <SectionLabel>Horario</SectionLabel>
            <Text style={styles.body}>
              {schedule}
              {group.frequency ? ` · ${group.frequency.toLowerCase()}` : ''}
            </Text>

            <SectionLabel>Próxima sesión</SectionLabel>
            {sessions.length === 0 ? (
              <Text style={styles.bodySoft}>Ninguna programada.</Text>
            ) : (
              <Text style={styles.session}>📅 {formatSessionDate(sessions[0].starts_at)}</Text>
            )}

            <SectionLabel>Miembros</SectionLabel>
            {group.group_members.map((member) => {
              const isGm = member.member_role === 'gm';
              return (
                <Pressable
                  key={member.user_id}
                  style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}
                  accessibilityLabel={`Ver perfil de ${member.profiles?.alias ?? 'miembro'}`}
                  onPress={() =>
                    navigate(() =>
                      router.push({ pathname: '/players/[id]', params: { id: member.user_id } })
                    )
                  }>
                  {member.profiles?.avatar_url ? (
                    <Image
                      source={{ uri: member.profiles.avatar_url }}
                      style={[styles.memberAvatar, isGm && styles.memberAvatarGm]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.memberAvatar,
                        styles.memberAvatarFallback,
                        isGm && styles.memberAvatarGm,
                      ]}>
                      <Text style={styles.memberEmoji}>{isGm ? '🧙‍♂️' : '🧝'}</Text>
                    </View>
                  )}
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.profiles?.alias ?? 'Sin alias'}
                    {isGm ? ' · GM' : ''}
                  </Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}

            <OutlineButton
              label="🛡️ Ver mesa completa"
              onPress={() =>
                navigate(() =>
                  router.push({ pathname: '/groups/[id]', params: { id: group.id } })
                )
              }
              style={styles.groupButton}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    width: 300,
    maxWidth: '85%',
    height: '100%',
    backgroundColor: Rolder.surface,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.12)',
  },
  content: {
    padding: 18,
    gap: 10,
    paddingBottom: 32,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    marginBottom: 4,
  },
  body: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    lineHeight: 18,
  },
  bodySoft: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  session: {
    color: Rolder.likeChipText,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  memberAvatarGm: {
    borderWidth: 2,
    borderColor: Rolder.gold,
  },
  memberAvatarFallback: {
    backgroundColor: 'rgba(139,108,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberEmoji: {
    fontSize: 16,
  },
  memberName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    flex: 1,
  },
  chevron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
  },
  groupButton: {
    marginTop: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
