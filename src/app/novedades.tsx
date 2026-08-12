// Lo que te has perdido: matches, gente pidiendo sitio, votaciones sin tu
// voto y la próxima partida. Antes esto solo existía dentro del push; si no
// lo veías, no había forma de enterarte sin recorrer mesa por mesa.

import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenBlurb, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchActivity, markActivitySeen, type ActivityItem } from '@/lib/activity';
import { cacheGet, cacheSet } from '@/lib/screen-cache';

export default function NovedadesScreen() {
  const session = useSession();
  const userId = session?.user.id ?? null;
  // arranca con lo último visto y refresca en silencio (patrón screen-cache)
  const [items, setItems] = useState<ActivityItem[] | undefined>(() =>
    userId ? cacheGet(`novedades:${userId}`) : undefined
  );

  const load = useCallback(() => {
    if (!userId) return;
    fetchActivity(userId)
      .then((activity) => {
        cacheSet(`novedades:${userId}`, activity);
        setItems(activity);
        // todo lo que se enseña queda visto: apaga el punto de la campana
        markActivitySeen(activity);
      })
      .catch(() => setItems((current) => current ?? []));
  }, [userId]);

  useEffect(load, [load]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <ScreenTitle>🔔 Novedades</ScreenTitle>
          <ScreenBlurb>Lo que ha pasado en tus mesas mientras no mirabas.</ScreenBlurb>

          {items === undefined ? (
            <ActivityIndicator style={styles.loading} />
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🌙</Text>
              <ThemedText type="small" style={styles.empty}>
                Nada nuevo. Cuando alguien pida sitio, se abra una votación o hagas match, te lo
                contamos aquí.
              </ThemedText>
            </View>
          ) : (
            items.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                accessibilityLabel={item.title}
                onPress={() => router.push(item.route as never)}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.body}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.detail}>{item.detail}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, width: '100%' },
  scroll: { padding: 20, gap: Spacing.three },
  loading: { marginTop: Spacing.four },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 14,
  },
  pressed: { opacity: 0.7 },
  emoji: { fontSize: 24 },
  body: { flex: 1, gap: 2 },
  title: { color: '#fff', fontSize: 14.5, fontFamily: RolderFonts.semibold, fontWeight: '600' },
  detail: { color: Rolder.textSecondary, fontSize: 12.5 },
  chevron: { color: 'rgba(255,255,255,0.4)', fontSize: 22 },
  emptyBox: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four },
  emptyEmoji: { fontSize: 34 },
  empty: { textAlign: 'center' },
});
