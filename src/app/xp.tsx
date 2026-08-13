// Mi nivel: cómo se gana XP y qué desbloquea. Misiones en curso y
// completadas (espejo del catálogo lib/xp.MISSIONS ↔ triggers de la DB) y
// recompensas: títulos por nivel y diseños de hoja con candado.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ScreenBlurb, ScreenTitle, SectionLabel, XpBar } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { showAlert } from '@/lib/alert';
import {
  AVATAR_FLAIRS,
  CARD_FRAMES,
  cosmeticUnlockLabel,
  fetchUserCosmetics,
  isCosmeticUnlocked,
  setMyCosmetic,
  type MyCosmetics,
} from '@/lib/cosmetics';
import { fetchPremiumStatus } from '@/lib/premium';
import { SHEET_THEMES, unlockLabel } from '@/lib/sheet-schema';
import {
  MISSIONS,
  TITLE_MILESTONES,
  fetchMyXpBreakdown,
  fetchXpTotals,
  levelInfoFromXp,
  type MissionProgress,
} from '@/lib/xp';

export default function XpScreen() {
  const session = useSession();
  const [xp, setXp] = useState(0);
  const [breakdown, setBreakdown] = useState<Map<string, MissionProgress>>(new Map());
  const [isPremium, setIsPremium] = useState(false);
  const [cosmetics, setCosmetics] = useState<MyCosmetics>({ cardFrame: null, avatarFlair: null });

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    fetchXpTotals([userId])
      .then((totals) => setXp(totals.get(userId) ?? 0))
      .catch(() => {});
    fetchMyXpBreakdown(userId)
      .then(setBreakdown)
      .catch(() => {});
    fetchPremiumStatus(userId)
      .then((status) => setIsPremium(status.active))
      .catch(() => {});
    fetchUserCosmetics(userId)
      .then(setCosmetics)
      .catch(() => {});
  }, [session]);

  // Equipar/quitar: optimista (la elección es cosmética; si falla, se repone)
  const equip = async (kind: 'card_frame' | 'avatar_flair', id: string | null) => {
    if (!session) return;
    const previous = cosmetics;
    const key = kind === 'card_frame' ? 'cardFrame' : 'avatarFlair';
    setCosmetics({ ...cosmetics, [key]: id });
    try {
      await setMyCosmetic(session.user.id, kind, id);
    } catch (error) {
      setCosmetics(previous);
      showAlert('No se pudo guardar', error instanceof Error ? error.message : String(error));
    }
  };

  const info = levelInfoFromXp(xp);
  const doneOnce = MISSIONS.filter((m) => m.once && (breakdown.get(m.kind)?.times ?? 0) > 0);
  const active = MISSIONS.filter((m) => !m.once || (breakdown.get(m.kind)?.times ?? 0) === 0);
  const lockedThemes = SHEET_THEMES.filter((t) => t.unlock !== 'free');
  const nextTitle = TITLE_MILESTONES.find((t) => t.level > info.level);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
          />
          <ScreenTitle>⚔️ Mi nivel</ScreenTitle>
          <ScreenBlurb>
            La experiencia se gana jugando de verdad: nada de farmeo, la otorga la propia
            actividad de tus mesas.
          </ScreenBlurb>

          <View style={styles.xpBlock}>
            <XpBar info={info} />
            <Text style={styles.xpDetail}>
              {info.nextLevelAt - info.totalXp} XP para el nivel {info.level + 1}
              {nextTitle
                ? ` · próximo título: «${nextTitle.title}» en nv. ${nextTitle.level}`
                : ' · título máximo alcanzado'}
            </Text>
          </View>

          <SectionLabel>Misiones en curso</SectionLabel>
          {active.map((mission) => {
            const progress = breakdown.get(mission.kind);
            return (
              <View key={mission.kind} style={styles.mission}>
                <Text style={styles.missionIcon}>{mission.icon}</Text>
                <View style={styles.missionBody}>
                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  <Text style={styles.missionDesc}>{mission.description}</Text>
                  {progress && progress.times > 0 && (
                    <Text style={styles.missionEarned}>
                      ✓ ×{progress.times} · {progress.earned} XP ganados
                    </Text>
                  )}
                </View>
                <View style={styles.rewardCol}>
                  <Text style={styles.reward}>{mission.reward}</Text>
                  {mission.capNote && <Text style={styles.capNote}>{mission.capNote}</Text>}
                </View>
              </View>
            );
          })}

          {doneOnce.length > 0 && (
            <>
              <SectionLabel>Misiones completadas</SectionLabel>
              {doneOnce.map((mission) => {
                const progress = breakdown.get(mission.kind);
                return (
                  <View key={mission.kind} style={[styles.mission, styles.missionDone]}>
                    <Text style={styles.missionIcon}>{mission.icon}</Text>
                    <View style={styles.missionBody}>
                      <Text style={styles.missionTitle}>✅ {mission.title}</Text>
                      <Text style={styles.missionDesc}>{mission.description}</Text>
                    </View>
                    <Text style={styles.rewardDone}>+{progress?.earned ?? 0} XP</Text>
                  </View>
                );
              })}
            </>
          )}

          <SectionLabel>Recompensas por nivel</SectionLabel>
          {TITLE_MILESTONES.map((milestone) => {
            const unlocked = info.level >= milestone.level;
            return (
              <View key={milestone.level} style={styles.rewardRow}>
                <Text style={[styles.rewardLevel, unlocked && styles.rewardLevelDone]}>
                  Nv. {milestone.level}
                </Text>
                <Text style={[styles.rewardTitle, !unlocked && styles.rewardLocked]}>
                  {unlocked ? '✅' : '🔒'} Título «{milestone.title}»
                </Text>
              </View>
            );
          })}
          {lockedThemes.map((theme) => {
            const unlocked =
              theme.unlock === 'premium'
                ? isPremium
                : theme.unlock !== 'free' && info.level >= theme.unlock.level;
            return (
              <View key={theme.id} style={styles.rewardRow}>
                <Text style={[styles.rewardLevel, unlocked && styles.rewardLevelDone]}>
                  {theme.unlock === 'premium' ? '✨' : unlockLabel(theme)?.replace('⚔️ ', '')}
                </Text>
                <Text style={[styles.rewardTitle, !unlocked && styles.rewardLocked]}>
                  {unlocked ? '✅' : '🔒'} Diseño de hoja «{theme.name}» {theme.emblem}
                </Text>
              </View>
            );
          })}
          <SectionLabel>Marcos de tarjeta</SectionLabel>
          <Text style={styles.equipHelp}>
            El marco rodea tu tarjeta en el feed. Toca uno desbloqueado para lucirlo (o para
            quitártelo).
          </Text>
          {CARD_FRAMES.map((frame) => {
            const unlocked = isCosmeticUnlocked(frame.unlock, info.level);
            const equipped = cosmetics.cardFrame === frame.id;
            return (
              <Pressable
                key={frame.id}
                disabled={!unlocked}
                onPress={() => equip('card_frame', equipped ? null : frame.id)}
                style={[styles.equipRow, equipped && styles.equipRowActive]}>
                <View style={[styles.frameSwatch, { borderColor: frame.color }]} />
                <Text style={[styles.rewardTitle, !unlocked && styles.rewardLocked]}>
                  {unlocked ? (equipped ? `✅ ${frame.name}` : frame.name) : `🔒 ${frame.name}`}
                </Text>
                <Text style={styles.equipMeta}>
                  {equipped ? 'En uso' : (cosmeticUnlockLabel(frame.unlock) ?? '')}
                </Text>
              </Pressable>
            );
          })}

          <SectionLabel>Flair de avatar</SectionLabel>
          <Text style={styles.equipHelp}>
            Un emblema junto a tu alias en las tarjetas y perfiles.
          </Text>
          {AVATAR_FLAIRS.map((flair) => {
            const unlocked = isCosmeticUnlocked(flair.unlock, info.level);
            const equipped = cosmetics.avatarFlair === flair.id;
            return (
              <Pressable
                key={flair.id}
                disabled={!unlocked}
                onPress={() => equip('avatar_flair', equipped ? null : flair.id)}
                style={[styles.equipRow, equipped && styles.equipRowActive]}>
                <Text style={styles.flairEmoji}>{flair.emoji}</Text>
                <Text style={[styles.rewardTitle, !unlocked && styles.rewardLocked]}>
                  {unlocked ? (equipped ? `✅ ${flair.name}` : flair.name) : `🔒 ${flair.name}`}
                </Text>
                <Text style={styles.equipMeta}>
                  {equipped ? 'En uso' : (cosmeticUnlockLabel(flair.unlock) ?? '')}
                </Text>
              </Pressable>
            );
          })}

          <Text style={styles.footNote}>
            El nivel es cosmético: presume de veteranía, no cambia el matching.
          </Text>
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
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  scroll: {
    padding: 20,
    gap: Spacing.three,
  },
  xpBlock: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  xpDetail: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  mission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    padding: 12,
  },
  missionDone: {
    opacity: 0.75,
    borderColor: 'rgba(59,209,111,0.35)',
  },
  missionIcon: {
    fontSize: 24,
  },
  missionBody: {
    flex: 1,
    gap: 2,
  },
  missionTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  missionDesc: {
    color: Rolder.textSecondary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    lineHeight: 16,
  },
  missionEarned: {
    color: Rolder.likeChipText,
    fontSize: 11.5,
    fontFamily: RolderFonts.semibold,
  },
  rewardCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  reward: {
    color: Rolder.gold,
    fontSize: 13,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  rewardDone: {
    color: Rolder.likeChipText,
    fontSize: 13,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  capNote: {
    color: Rolder.textTertiary,
    fontSize: 10.5,
    fontFamily: RolderFonts.regular,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  rewardLevel: {
    color: Rolder.textTertiary,
    fontSize: 12.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    width: 58,
  },
  rewardLevelDone: {
    color: Rolder.violetSoft,
  },
  rewardTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    flexShrink: 1,
  },
  rewardLocked: {
    color: Rolder.textSecondary,
  },
  footNote: {
    color: Rolder.textTertiary,
    fontSize: 11.5,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  equipHelp: {
    color: Rolder.textSecondary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    marginTop: -6,
  },
  equipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  equipRowActive: {
    borderColor: Rolder.violet,
  },
  frameSwatch: {
    width: 26,
    height: 34,
    borderRadius: 6,
    borderWidth: 3,
    backgroundColor: Rolder.input,
  },
  flairEmoji: {
    fontSize: 22,
    width: 26,
    textAlign: 'center',
  },
  equipMeta: {
    marginLeft: 'auto',
    color: Rolder.textTertiary,
    fontSize: 11.5,
    fontFamily: RolderFonts.semibold,
  },
});
