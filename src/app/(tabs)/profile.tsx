// Tab Perfil: el hub personal — identidad, nivel y todas las secciones que
// antes vivían en el menú del avatar (editar, personajes, matches, opciones,
// cerrar sesión).

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmAction } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, XpBar } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { signOut } from '@/lib/auth';
import { fetchProfileData, type ProfileData } from '@/lib/profile';
import { fetchXpTotals, levelInfoFromXp } from '@/lib/xp';

const LINKS: { icon: string; label: string; route: string }[] = [
  { icon: '👤', label: 'Editar perfil', route: '/onboarding' },
  { icon: '🧙', label: 'Mis personajes', route: '/characters' },
  { icon: '🤝', label: 'Mis matches', route: '/matches' },
  { icon: '⚙️', label: 'Opciones', route: '/settings' },
];

export default function ProfileTabScreen() {
  const session = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [xp, setXp] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      fetchProfileData(session.user.id).then(setProfile).catch(() => {});
      fetchXpTotals([session.user.id])
        .then((totals) => setXp(totals.get(session.user.id) ?? 0))
        .catch(() => {});
    }, [session])
  );

  const levelInfo = levelInfoFromXp(xp);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader />

          <Pressable
            style={styles.identity}
            onPress={() =>
              session &&
              router.push({ pathname: '/players/[id]', params: { id: session.user.id } })
            }>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarEmoji}>🧙</Text>
              </View>
            )}
            <Text style={styles.alias}>{profile?.alias ?? '…'}</Text>
            <Text style={styles.publicLink}>Ver mi perfil público ›</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.xpBlock, pressed && styles.xpPressed]}
            accessibilityLabel="Ver misiones y recompensas"
            onPress={() => router.push('/xp')}>
            <XpBar info={levelInfo} />
            <Text style={styles.xpLink}>Misiones y recompensas ›</Text>
          </Pressable>

          {LINKS.map((link) => (
            <ListRow key={link.label} onPress={() => router.push(link.route as never)}>
              <Text style={styles.linkIcon}>{link.icon}</Text>
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </ListRow>
          ))}

          <ListRow
            onPress={async () => {
              const ok = await confirmAction(
                '¿Cerrar sesión?',
                'Tendrás que volver a entrar para usar la app.',
                'Sí, cerrar sesión'
              );
              if (ok) signOut();
            }}>
            <Text style={styles.linkIcon}>🚪</Text>
            <Text style={[styles.linkLabel, styles.signOut]}>Cerrar sesión</Text>
          </ListRow>
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
  identity: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
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
    fontSize: 22,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  publicLink: {
    color: Rolder.violetSoft,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
  },
  xpBlock: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  xpPressed: {
    opacity: 0.85,
  },
  xpLink: {
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
    textAlign: 'right',
  },
  linkIcon: {
    fontSize: 20,
    width: 26,
    textAlign: 'center',
  },
  linkLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    flex: 1,
  },
  chevron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
  },
  signOut: {
    color: '#F3485B',
  },
});
