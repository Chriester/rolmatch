// Crónica pública de una campaña (migr. 00060): el histórico de la mesa
// legible por CUALQUIERA con el enlace, sin cuenta — el GM lo activa desde
// el histórico. Ruta fuera de los guardas de sesión (_layout), como la
// ficha de invitación de mesa.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, RolderRadius, Spacing } from '@/constants/theme';
import {
  fetchCampaignJournal,
  fetchCampaignPage,
  groupJournalEntries,
  type CampaignPage,
  type JournalEntry,
} from '@/lib/journal';

const FORMAT_LABELS: Record<string, string> = { campaign: 'Campaña', oneshot: 'One-shot' };

function formatEntryTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function PublicCampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pageData, setPageData] = useState<CampaignPage | null | undefined>(undefined);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchCampaignPage(id)
      .then((p) => {
        setPageData(p);
        if (p) {
          fetchCampaignJournal(id)
            .then(setEntries)
            .catch(() => {});
        }
      })
      .catch(() => setPageData(null));
  }, [id]);

  if (pageData === undefined) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (pageData === null) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <Text style={styles.emptyTitle}>Esta crónica no está disponible</Text>
        <Text style={styles.emptyBody}>
          O el enlace no existe, o la mesa ha preferido mantener su historia en privado.
        </Text>
        <PrimaryButton label="Descubrir mesas en rolder" onPress={() => router.replace('/')} />
      </ThemedView>
    );
  }

  const chapters = groupJournalEntries(entries);
  const detailLine = [pageData.system_name, FORMAT_LABELS[pageData.format] ?? null]
    .filter(Boolean)
    .join(' · ');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {pageData.image_url ? (
            <Image source={{ uri: pageData.image_url }} style={styles.hero} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={['#8A2B76', '#5D4A93']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, styles.heroFallback]}>
              <Text style={styles.heroEmoji}>🎲</Text>
            </LinearGradient>
          )}

          <Text style={styles.kicker}>Crónica de campaña</Text>
          <Text style={styles.title}>{pageData.name}</Text>
          {detailLine.length > 0 && <Text style={styles.detail}>{detailLine}</Text>}
          {pageData.description && <Text style={styles.description}>{pageData.description}</Text>}

          {chapters.length === 0 ? (
            <Text style={styles.emptyBody}>
              La crónica está recién abierta: los primeros recuerdos llegarán tras la próxima
              partida.
            </Text>
          ) : (
            chapters.map((chapter) => (
              <View key={chapter.sessionId ?? 'sin-sesion'} style={styles.chapter}>
                <Text style={styles.chapterTitle}>
                  {chapter.header?.body ?? 'Recuerdos sueltos'}
                </Text>
                {chapter.entries.map((entry) => (
                  <View key={entry.id} style={styles.entry}>
                    <Text style={styles.entryMeta}>
                      {entry.profiles?.alias ?? 'Un miembro de la mesa'} ·{' '}
                      {formatEntryTime(entry.created_at)}
                    </Text>
                    {entry.image_url && (
                      <Image
                        source={{ uri: entry.image_url }}
                        style={styles.entryImage}
                        contentFit="cover"
                      />
                    )}
                    {entry.body && <Text style={styles.entryBody}>{entry.body}</Text>}
                  </View>
                ))}
              </View>
            ))
          )}

          <View style={styles.cta}>
            <Text style={styles.ctaText}>
              ¿Quieres vivir una historia como esta? En rolder hay mesas buscando gente como tú.
            </Text>
            <PrimaryButton label="Encontrar mi mesa" onPress={() => router.replace('/')} />
          </View>
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
    flexDirection: 'column',
    gap: Spacing.three,
    padding: 24,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  scroll: {
    padding: 20,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  hero: {
    height: 180,
    borderRadius: 20,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 64,
  },
  kicker: {
    color: Rolder.violetSoft,
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.one,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  detail: {
    color: Rolder.textSecondary,
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
  },
  description: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: RolderFonts.regular,
  },
  chapter: {
    gap: 10,
    marginTop: Spacing.two,
  },
  chapterTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  entry: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: RolderRadius.lg,
    padding: 12,
    gap: 8,
  },
  entryMeta: {
    color: Rolder.textTertiary,
    fontSize: 11.5,
    fontFamily: RolderFonts.semibold,
  },
  entryImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
  },
  entryBody: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: RolderFonts.regular,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: Rolder.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
  },
  cta: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  ctaText: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
  },
});
