// Perfil público de un jugador: accesible desde las plazas de una mesa,
// los matches y los likes — toda la info que el matching usa, visible
// también después del match.

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmAction, humanizeError, showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import {
  AvailabilityMiniGrid,
  availabilityCellKey,
} from '@/components/swipe/availability-mini-grid';
import { CardChip, CardChipRow } from '@/components/swipe/card-shell';
import { CharacterLikeButton } from '@/components/swipe/character-like-button';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, SectionLabel, StatusPill, StyleBar, XpBar } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { FORMAT_LABELS, VTT_LABELS } from '@/lib/groups';
import { characterAgeLabel } from '@/lib/characters';
import { getOrCreateDmThread } from '@/lib/dm';
import { blockUser } from '@/lib/moderation';
import { fetchPlayerProfile, type PlayerProfile } from '@/lib/players';
import { GENDER_LABELS, SAFETY_TOOL_LABELS, ageFromBirthYear } from '@/lib/profile';
import { cacheGet, cacheSet } from '@/lib/screen-cache';
import { ServiceStatsRow } from '@/components/service-stats';
import { flairFor } from '@/lib/cosmetics';
import { levelInfoFromXp } from '@/lib/xp';

const ROLE_LABELS: Record<string, string> = {
  player: 'Jugador/a',
  gm: 'GM / Máster',
  both: 'Jugador/a y GM',
};

const STATUS_PILL = {
  playing: { label: 'EN JUEGO', tone: 'violet' as const },
  looking: { label: 'BUSCANDO MESA', tone: 'green' as const },
  retired: { label: 'RETIRADA', tone: 'gray' as const },
  fallen: { label: 'CAÍDO EN COMBATE', tone: 'gray' as const },
};

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  // arranca con lo último visto para no enseñar la rueda al revisitar
  const [profile, setProfile] = useState<PlayerProfile | null | undefined>(() =>
    id ? cacheGet(`player:${id}`) : undefined
  );
  const [dmBusy, setDmBusy] = useState(false);

  const handleOpenDm = async () => {
    if (!session || !id || dmBusy) return;
    setDmBusy(true);
    try {
      const threadId = await getOrCreateDmThread(session.user.id, id);
      router.push({ pathname: '/dm/[id]', params: { id: threadId } });
    } catch (error) {
      showAlert(
        'No se pudo abrir el chat',
        humanizeError(error)
      );
    } finally {
      setDmBusy(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchPlayerProfile(id)
      .then((p) => {
        cacheSet(`player:${id}`, p);
        setProfile(p);
      })
      .catch(() => setProfile((current) => current ?? null));
  }, [id]);

  if (profile === undefined) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (profile === null) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <Text style={styles.body}>No se pudo cargar el perfil.</Text>
      </ThemedView>
    );
  }

  const isMe = session?.user.id === id;
  const publicCharacters = profile.characters.filter((c) => c.is_public || isMe);
  const levelInfo = levelInfoFromXp(profile.xpTotal);
  const flair = flairFor(profile.cosmetics.avatarFlair, levelInfo.level);
  const age = ageFromBirthYear(profile.birth_year);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />

          <View style={styles.identity}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarEmoji}>🧙</Text>
              </View>
            )}
            <Text style={styles.alias}>
              {profile.alias}
              {flair ? ` ${flair.emoji}` : ''}
              {age !== null ? `, ${age}` : ''}
            </Text>
            <CardChipRow>
              <CardChip label={ROLE_LABELS[profile.role] ?? profile.role} />
              {profile.gender && <CardChip label={GENDER_LABELS[profile.gender]} />}
              <CardChip label={`🌍 ${profile.timezone}`} />
              <CardChip label={`⚔️ Nv. ${levelInfo.level} · ${levelInfo.title}`} />
              {profile.reliability && profile.reliability.count > 0 && (
                <CardChip
                  variant="green"
                  label={`🎲 ${profile.reliability.average.toFixed(1)}/5 (${profile.reliability.count})`}
                />
              )}
            </CardChipRow>
          </View>

          {profile.service && <ServiceStatsRow stats={profile.service} />}

          {session && !isMe && (
            <OutlineButton
              label={dmBusy ? 'Abriendo…' : '💬 Enviar mensaje'}
              onPress={handleOpenDm}
              disabled={dmBusy}
            />
          )}

          {isMe && (
            <Pressable
              style={styles.block}
              accessibilityLabel="Ver misiones y recompensas"
              onPress={() => router.push('/xp')}>
              <SectionLabel>Mi nivel</SectionLabel>
              <XpBar info={levelInfo} />
              <Text style={styles.xpLink}>Misiones y recompensas ›</Text>
            </Pressable>
          )}

          {profile.bio && (
            <View style={styles.block}>
              <SectionLabel>Sobre mí</SectionLabel>
              <Text style={styles.body}>{profile.bio}</Text>
            </View>
          )}

          <View style={styles.block}>
            <SectionLabel>Su semana</SectionLabel>
            <AvailabilityMiniGrid
              cells={
                new Set(profile.availability.map((a) => availabilityCellKey(a.weekday, a.slot)))
              }
            />
          </View>

          <View style={styles.block}>
            <SectionLabel>Cómo juega</SectionLabel>
            <StyleBar left="Combate" right="Narrativo" value={profile.style_combat_narrative} />
            <StyleBar left="Serio" right="Humor" value={profile.style_serious_humor} />
            <StyleBar
              left="Roleo ligero"
              right="Roleo pesado"
              value={profile.style_roleplay_weight}
            />
            <Text style={styles.bodySoft}>
              {[
                profile.voice_chat ? '🎙 con voz' : 'sin voz',
                profile.camera_ok ? '🎥 cámara ok' : null,
                VTT_LABELS[profile.preferred_vtt],
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>

          {profile.safety_tools.length > 0 && (
            <View style={styles.block}>
              <SectionLabel>🛡 Seguridad en mesa</SectionLabel>
              <CardChipRow>
                {profile.safety_tools
                  .filter((tool) => SAFETY_TOOL_LABELS[tool])
                  .map((tool) => (
                    <CardChip key={tool} label={SAFETY_TOOL_LABELS[tool]} />
                  ))}
              </CardChipRow>
            </View>
          )}

          <View style={styles.block}>
            <SectionLabel>A qué juega</SectionLabel>
            {profile.systemsNamed.length === 0 && !profile.open_to_any_system ? (
              <Text style={styles.bodySoft}>Sin sistemas definidos.</Text>
            ) : (
              <Text style={styles.body}>
                {profile.systemsNamed.map((s) => `${s.name} (${s.experience})`).join(' · ')}
                {profile.open_to_any_system
                  ? `${profile.systemsNamed.length > 0 ? ' · ' : ''}abierto/a a cualquier sistema`
                  : ''}
              </Text>
            )}
          </View>

          {publicCharacters.length > 0 && (
            <View style={styles.block}>
              <SectionLabel>Sus personajes</SectionLabel>
              {publicCharacters.map((ch) => {
                const pill = STATUS_PILL[ch.status];
                return (
                  <ListRow
                    key={ch.id}
                    onPress={() =>
                      router.push({ pathname: '/characters/[id]', params: { id: ch.id } })
                    }>
                    {ch.portrait_url ? (
                      <Image source={{ uri: ch.portrait_url }} style={styles.portrait} />
                    ) : (
                      <View style={[styles.portrait, styles.portraitFallback]}>
                        <Text style={styles.portraitEmoji}>🧝</Text>
                      </View>
                    )}
                    <View style={styles.characterBody}>
                      <Text style={styles.characterName} numberOfLines={1}>
                        {ch.name}
                      </Text>
                      <Text style={styles.bodySoft} numberOfLines={1}>
                        {[
                          ch.archetype,
                          ch.systems?.name,
                          ch.level && `Nivel ${ch.level}`,
                          ch.gender && GENDER_LABELS[ch.gender],
                          characterAgeLabel(ch.age),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                      {ch.concept && (
                        <Text style={styles.concept} numberOfLines={1}>
                          {ch.concept}
                        </Text>
                      )}
                      <View style={styles.characterFooter}>
                        <StatusPill label={pill.label} tone={pill.tone} />
                      </View>
                    </View>
                    {session && !isMe && (
                      <CharacterLikeButton characterId={ch.id} viewerId={session.user.id} />
                    )}
                  </ListRow>
                );
              })}
            </View>
          )}

          {profile.groups.length > 0 && (
            <View style={styles.block}>
              <SectionLabel>Sus mesas</SectionLabel>
              {profile.groups.map((g) => (
                <ListRow
                  key={g.id}
                  onPress={() =>
                    router.push({ pathname: '/groups/[id]', params: { id: g.id } })
                  }>
                  {g.image_url ? (
                    <Image source={{ uri: g.image_url }} style={styles.groupThumb} />
                  ) : (
                    <View style={[styles.groupThumb, styles.groupThumbFallback]}>
                      <Text style={styles.portraitEmoji}>🎲</Text>
                    </View>
                  )}
                  <View style={styles.characterBody}>
                    <Text style={styles.characterName} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={styles.bodySoft} numberOfLines={1}>
                      {[g.systems?.name, FORMAT_LABELS[g.format]].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </ListRow>
              ))}
            </View>
          )}

          {!isMe && (
            <View style={styles.moderationRow}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/report',
                    params: { kind: 'user', id, name: profile.alias },
                  })
                }>
                <Text style={styles.reportLink}>Reportar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!session || !id) return;
                  const ok = await confirmAction(
                    `¿Bloquear a ${profile.alias}?`,
                    'Dejaréis de veros en feeds y chats, en ambas direcciones. Se puede deshacer solo contactando con soporte.',
                    'Sí, bloquear'
                  );
                  if (!ok) return;
                  try {
                    await blockUser(session.user.id, id);
                    showAlert('Bloqueado', `${profile.alias} ya no puede verte ni escribirte.`);
                    router.replace('/');
                  } catch (error) {
                    showAlert(
                      'No se pudo bloquear',
                      humanizeError(error)
                    );
                  }
                }}>
                <Text style={styles.reportLink}>Bloquear</Text>
              </Pressable>
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
  identity: {
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(123,92,255,0.7)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(139,108,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  alias: {
    color: '#fff',
    fontSize: 24,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  block: {
    gap: 8,
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
  portrait: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  portraitFallback: {
    backgroundColor: 'rgba(255,90,95,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: {
    fontSize: 24,
  },
  characterBody: {
    flex: 1,
    gap: 3,
  },
  characterName: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  concept: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    fontStyle: 'italic',
  },
  characterFooter: {
    flexDirection: 'row',
    marginTop: 3,
  },
  groupThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  groupThumbFallback: {
    backgroundColor: 'rgba(139,108,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpLink: {
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
    textAlign: 'right',
  },
  moderationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.six,
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  reportLink: {
    color: Rolder.pass,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    textAlign: 'center',
  },
});
