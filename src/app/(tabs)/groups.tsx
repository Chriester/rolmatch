// Mis mesas rediseñada (entregable 4a): de lista de archivos a home de tus
// partidas. Spotlight «hoy toca partida» arriba, grupos «Dirijo» / «Juego»,
// portada con gradiente propio por mesa (CoverStrip), pendientes como
// StatChips (solo cuando hay algo) y el aviso de inactividad accionable
// sin entrar. El botón «Candidatos» suelto desaparece: vive como StatChip
// y dentro de la ficha.

import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { CoverStrip } from '@/components/cover-strip';
import { InlineBanner } from '@/components/inline-banner';
import { StatChip } from '@/components/stat-chip';
import { ThemedView } from '@/components/themed-view';
import { ListRow, ScreenTitle, SectionLabel, StatusPill } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { showAlert } from '@/lib/alert';
import { FORMAT_LABELS, archiveGroup, confirmGroupAlive } from '@/lib/groups';
import { fetchMyTablesOverview, type MyTableRow, type MyTablesOverview } from '@/lib/my-tables';
import { warmGroup } from '@/lib/prefetch';

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function nextLabel(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
}

/** Fila-tarjeta de mesa: portada + meta + pendientes. Todo el ancho navega. */
function TableCard({ table, onVitality }: { table: MyTableRow; onVitality: () => void }) {
  const [busy, setBusy] = useState(false);

  const chips: { label: string; tone: 'green' | 'violet' | 'amber' }[] = [];
  if (table.unread > 0)
    chips.push({ label: `💬 ${table.unread === 1 ? '1 nuevo' : `${table.unread} nuevos`}`, tone: 'violet' });
  if (table.applicants > 0)
    chips.push({
      label: `⚔️ ${table.applicants === 1 ? '1 pide sitio' : `${table.applicants} piden sitio`}`,
      tone: 'green',
    });
  if (table.voteAwaits) chips.push({ label: '📅 Te falta votar fecha', tone: 'amber' });

  const meta =
    table.role === 'gm'
      ? [
          table.systemName ?? 'Sistema sin definir',
          FORMAT_LABELS[table.format],
          `${table.players} en mesa`,
          table.freeSeats > 0
            ? `${table.freeSeats} ${table.freeSeats === 1 ? 'libre' : 'libres'}`
            : null,
        ]
      : [
          table.systemName ?? 'Sistema sin definir',
          table.gmAlias ? `dirige ${table.gmAlias}` : null,
          table.nextSession
            ? `próxima: ${nextLabel(table.nextSession.startsAt)} · ${timeLabel(table.nextSession.startsAt)}`
            : null,
        ];

  return (
    <Pressable
      accessibilityLabel={`Mesa ${table.name}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push({ pathname: '/groups/[id]', params: { id: table.id } })}>
      <CoverStrip
        name={table.name}
        imageUrl={table.image_url}
        right={
          <StatusPill
            label={table.is_active ? 'ACTIVA' : 'INACTIVA'}
            tone={table.is_active ? 'green' : 'gray'}
          />
        }
      />
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {meta.filter(Boolean).join(' · ')}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </View>
        {chips.length > 0 && (
          <View style={styles.chipRow}>
            {chips.map((chip) => (
              <StatChip key={chip.label} label={chip.label} tone={chip.tone} />
            ))}
          </View>
        )}
        {table.warned && table.role === 'gm' && (
          <InlineBanner
            tone="amber"
            title="⚠️ Sin señales de vida en semanas. ¿Seguís jugando?"
            actions={[
              {
                label: busy ? 'Un momento…' : '¡Seguimos! 🎲',
                primary: true,
                disabled: busy,
                onPress: async () => {
                  setBusy(true);
                  try {
                    await confirmGroupAlive(table.id);
                    onVitality();
                  } catch (error) {
                    showAlert('No se pudo', error instanceof Error ? error.message : String(error));
                  } finally {
                    setBusy(false);
                  }
                },
              },
              {
                label: 'Archivar',
                disabled: busy,
                onPress: async () => {
                  setBusy(true);
                  try {
                    await archiveGroup(table.id);
                    onVitality();
                  } catch (error) {
                    showAlert('No se pudo', error instanceof Error ? error.message : String(error));
                  } finally {
                    setBusy(false);
                  }
                },
              },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
}

export default function MyGroupsScreen() {
  const session = useSession();
  const [overview, setOverview] = useState<MyTablesOverview | undefined>(undefined);

  const load = useCallback(() => {
    if (!session) return;
    fetchMyTablesOverview(session.user.id)
      .then((data) => {
        setOverview(data);
        // precalienta las fichas: tocar una mesa abre el hub sin página en blanco
        data.tables.slice(0, 8).forEach((t) => warmGroup(t.id));
      })
      .catch(() => setOverview({ tables: [], today: null }));
  }, [session]);

  useFocusEffect(load);

  const gmTables = overview?.tables.filter((t) => t.role === 'gm') ?? [];
  const playerTables = overview?.tables.filter((t) => t.role === 'player') ?? [];
  const active = overview?.tables.filter((t) => t.is_active).length ?? 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader />
        <View style={styles.titleRow}>
          <ScreenTitle>🛡️ Mis mesas</ScreenTitle>
          {overview !== undefined && overview.tables.length > 0 && (
            <Text style={styles.countLabel}>
              {overview.tables.length} {overview.tables.length === 1 ? 'mesa' : 'mesas'} · {active}{' '}
              {active === 1 ? 'activa' : 'activas'}
            </Text>
          )}
        </View>

        {overview === undefined ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {/* El momento estrella de la semana, arriba y en verde */}
            {overview.today !== null &&
              (() => {
                const today = overview.today;
                return (
                  <Pressable
                    accessibilityLabel={`Hoy toca partida en ${today.groupName}`}
                    onPress={() =>
                      router.push({ pathname: '/groups/[id]', params: { id: today.groupId } })
                    }>
                    {({ pressed }) => (
                      <LinearGradient
                        colors={[Rolder.like, Rolder.likeDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.spotlight, pressed && styles.cardPressed]}>
                        <Text style={styles.spotlightKicker}>🔥 HOY TOCA PARTIDA</Text>
                        <Text style={styles.spotlightName} numberOfLines={1}>
                          {today.groupName}
                        </Text>
                        <Text style={styles.spotlightMeta}>
                          {timeLabel(today.startsAt)} h · {today.confirmed}/{today.members}{' '}
                          confirmados 💪
                        </Text>
                        <Text style={styles.spotlightCta}>Ir a la mesa →</Text>
                      </LinearGradient>
                    )}
                  </Pressable>
                );
              })()}

            {overview.tables.length === 0 && (
              <Text style={styles.empty}>
                Aún no tienes ninguna mesa. Crea la tuya y que te encuentren, o sal al feed a
                buscar sitio.
              </Text>
            )}

            {gmTables.length > 0 && (
              <>
                <SectionLabel>🧙 Dirijo</SectionLabel>
                {gmTables.map((table) => (
                  <TableCard key={table.id} table={table} onVitality={load} />
                ))}
              </>
            )}

            {playerTables.length > 0 && (
              <>
                <SectionLabel>⚔️ Juego</SectionLabel>
                {playerTables.map((table) => (
                  <TableCard key={table.id} table={table} onVitality={load} />
                ))}
              </>
            )}

            <ListRow dashed onPress={() => router.push('/groups/new')}>
              <Text style={styles.dashedLabel}>+ Crear mesa</Text>
            </ListRow>
            <Pressable
              accessibilityLabel="Buscar mesas en el feed"
              style={({ pressed }) => [styles.feedLink, pressed && styles.cardPressed]}
              onPress={() => router.navigate('/')}>
              <Text style={styles.feedLinkLabel}>🔭 Buscar en el feed</Text>
            </Pressable>
          </ScrollView>
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
    gap: Spacing.three,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  countLabel: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginVertical: Spacing.four,
    lineHeight: 19,
  },
  list: {
    gap: 12,
    paddingBottom: Spacing.four,
  },
  spotlight: {
    borderRadius: 18,
    padding: 16,
    gap: 4,
  },
  spotlightKicker: {
    color: 'rgba(11,11,18,0.75)',
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  spotlightName: {
    color: '#0B0B12',
    fontSize: 20,
    fontFamily: RolderFonts.bold,
    fontWeight: '800',
  },
  spotlightMeta: {
    color: 'rgba(11,11,18,0.8)',
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  spotlightCta: {
    color: '#0B0B12',
    fontSize: 13,
    fontFamily: RolderFonts.bold,
    fontWeight: '800',
    marginTop: 4,
  },
  card: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardBody: {
    padding: 12,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  meta: {
    flex: 1,
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  chevron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dashedLabel: {
    color: Rolder.violetSofter,
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  feedLink: {
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  feedLinkLabel: {
    color: Rolder.textSecondary,
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
});
