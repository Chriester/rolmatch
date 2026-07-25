// Mis personajes (handoff §12): la vitrina pública — retratos, meta y
// pill de estado; tarjeta punteada para crear.

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, ScreenBlurb, ScreenTitle, StatusPill } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { fetchMyCharacters, type Character, type CharacterStatus } from '@/lib/characters';

const STATUS_PILL: Record<CharacterStatus, { label: string; tone: 'violet' | 'green' | 'gray' }> = {
  playing: { label: 'EN JUEGO', tone: 'violet' },
  looking: { label: 'BUSCANDO MESA', tone: 'green' },
  retired: { label: 'RETIRADA', tone: 'gray' },
};

export default function MyCharactersScreen() {
  const session = useSession();
  const [characters, setCharacters] = useState<Character[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    setCharacters(undefined);
    fetchMyCharacters(session.user.id)
      .then(setCharacters)
      .catch(() => setLoadError(true));
  }, [session]);

  useFocusEffect(load);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader onBack={router.canGoBack() ? () => router.back() : undefined} />
        <ScreenTitle>🧙 Mis personajes</ScreenTitle>
        <ScreenBlurb>Tu vitrina pública. Los GMs la ven al girar tu tarjeta.</ScreenBlurb>

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.empty}>No se pudieron cargar tus personajes.</Text>
            <OutlineButton label="Reintentar" onPress={load} />
          </View>
        ) : characters === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <FlatList
            data={characters}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            ListFooterComponent={
              <ListRow dashed onPress={() => router.push('/characters/new')}>
                <Text style={styles.dashedLabel}>+ Nuevo personaje</Text>
              </ListRow>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                Tu vitrina está vacía. Crea tu primer personaje: los GMs verán los que estén
                «buscando mesa» cuando aparezcas como candidato.
              </Text>
            }
            renderItem={({ item }) => {
              const pill = STATUS_PILL[item.status];
              return (
                <ListRow
                  onPress={() =>
                    router.push({ pathname: '/characters/[id]', params: { id: item.id } })
                  }>
                  {item.portrait_url ? (
                    <Image source={{ uri: item.portrait_url }} style={styles.portrait} />
                  ) : (
                    <View style={[styles.portrait, styles.portraitFallback]}>
                      <Text style={styles.portraitEmoji}>🧝</Text>
                    </View>
                  )}
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[item.archetype, item.systems?.name, item.level && `Nivel ${item.level}`]
                        .filter(Boolean)
                        .join(' · ') || 'Sin detalles todavía'}
                    </Text>
                    {item.concept && (
                      <Text style={styles.concept} numberOfLines={1}>
                        {item.concept}
                      </Text>
                    )}
                  </View>
                  <StatusPill label={pill.label} tone={pill.tone} />
                </ListRow>
              );
            }}
          />
        )}
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
    paddingHorizontal: 20,
    paddingTop: Spacing.two,
    gap: 10,
    width: '100%',
  },
  loading: {
    marginTop: Spacing.six,
  },
  errorBox: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  empty: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginVertical: Spacing.four,
  },
  list: {
    gap: 12,
    paddingTop: 6,
    paddingBottom: Spacing.four,
  },
  portrait: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  portraitFallback: {
    backgroundColor: 'rgba(255,90,95,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: {
    fontSize: 28,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  meta: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  concept: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    fontStyle: 'italic',
  },
  dashedLabel: {
    color: Rolder.violetSofter,
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
