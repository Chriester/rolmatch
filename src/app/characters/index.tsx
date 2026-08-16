// Mis personajes (handoff §12): la vitrina pública — retratos, meta y
// pill de estado; tarjeta punteada para crear.

import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, ScreenBlurb, ScreenTitle, StatusPill } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, RolderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  characterMilestone,
  fetchMyCharacters,
  type Character,
  type CharacterStatus,
} from '@/lib/characters';
import { cacheGet, cacheSet } from '@/lib/screen-cache';

const STATUS_PILL: Record<CharacterStatus, { label: string; tone: 'violet' | 'green' | 'gray' }> = {
  playing: { label: 'EN JUEGO', tone: 'violet' },
  looking: { label: 'BUSCANDO MESA', tone: 'green' },
  retired: { label: 'RETIRADA', tone: 'gray' },
  fallen: { label: 'CAÍDO EN COMBATE', tone: 'gray' },
};

export default function MyCharactersScreen() {
  const session = useSession();
  // arranca con lo último visto (o lo precalentado por warmHomeTabs) y
  // refresca en silencio: la rueda solo sale sin nada en caché
  const [characters, setCharacters] = useState<Character[] | undefined>(() =>
    session ? cacheGet(`characters:${session.user.id}`) : undefined
  );
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    const cached = cacheGet<Character[]>(`characters:${session.user.id}`);
    if (cached) setCharacters((current) => current ?? cached);
    fetchMyCharacters(session.user.id)
      .then((list) => {
        cacheSet(`characters:${session.user.id}`, list);
        setCharacters(list);
      })
      .catch(() => setLoadError(true));
  }, [session]);

  useFocusEffect(load);

  const renderCharacterRow = (item: Character) => {
    const pill = STATUS_PILL[item.status];
    const life =
      item.sessions_lived > 0
        ? `${item.sessions_lived} ${item.sessions_lived === 1 ? 'sesión vivida' : 'sesiones vividas'}`
        : null;
    const milestone = characterMilestone(item.sessions_lived);
    return (
      <ListRow
        onPress={() => router.push({ pathname: '/characters/[id]', params: { id: item.id } })}>
        {item.portrait_url ? (
          <Image source={{ uri: item.portrait_url }} style={styles.portrait} />
        ) : (
          <View style={[styles.portrait, styles.portraitFallback]}>
            <Text style={styles.portraitEmoji}>{item.status === 'fallen' ? '🪦' : '🧝'}</Text>
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
          {(life || milestone) && (
            <Text style={styles.life} numberOfLines={1}>
              {[life, milestone].filter(Boolean).join(' · ')}
            </Text>
          )}
          {item.concept && (
            <Text style={styles.concept} numberOfLines={1}>
              {item.concept}
            </Text>
          )}
        </View>
        <View style={styles.rowActions}>
          <StatusPill label={pill.label} tone={pill.tone} />
          <Pressable
            onPress={() =>
              router.push({ pathname: '/characters/[id]', params: { id: item.id, edit: '1' } })
            }
            hitSlop={8}
            accessibilityLabel={`Editar ${item.name}`}>
            <Text style={styles.editLink}>Editar</Text>
          </Pressable>
        </View>
      </ListRow>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader onBack={router.canGoBack() ? () => router.back() : undefined} />
        <ScreenTitle>Mis personajes</ScreenTitle>
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
            data={characters.filter((c) => c.status !== 'fallen')}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            ListFooterComponent={
              <View style={styles.list}>
                {characters.some((c) => c.status === 'fallen') && (
                  <>
                    <Text style={styles.cemeteryTitle}>Cementerio</Text>
                    <Text style={styles.cemeteryBlurb}>
                      Los que cayeron con las botas puestas. Descansen en paz.
                    </Text>
                    {characters
                      .filter((c) => c.status === 'fallen')
                      .map((item) => (
                        <View key={item.id} style={styles.fallenRow}>
                          {renderCharacterRow(item)}
                        </View>
                      ))}
                  </>
                )}
                <ListRow dashed onPress={() => router.push('/characters/new')}>
                  <Text style={styles.dashedLabel}>+ Nuevo personaje</Text>
                </ListRow>
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                Tu vitrina está vacía. Crea tu primer personaje: los GMs verán los que estén
                «buscando mesa» cuando aparezcas como candidato.
              </Text>
            }
            renderItem={({ item }) => renderCharacterRow(item)}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  rowActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  editLink: {
    color: Rolder.violetSoft,
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
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
    borderRadius: RolderRadius.lg,
  },
  portraitFallback: {
    backgroundColor: 'rgba(229,72,77,0.18)',
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
  life: {
    color: Rolder.gold,
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
  },
  cemeteryTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  cemeteryBlurb: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    marginTop: -8,
  },
  fallenRow: {
    opacity: 0.65,
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
