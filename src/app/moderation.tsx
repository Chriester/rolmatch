// Bandeja de moderación. Hasta ahora reportar era un buzón sin destinatario:
// el reporte se insertaba, se mandaba un push a los moderadores y ahí moría,
// porque no había ni pantalla ni forma de marcarlo. Esto es la otra mitad.

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
import { showAlert } from '@/lib/alert';
import { FEEDBACK_KINDS, fetchFeedback, setFeedbackStatus, type FeedbackItem } from '@/lib/feedback';
import {
  fetchReports,
  setReportStatus,
  type ModerationReport,
  type ReportStatus,
} from '@/lib/moderation';

const FILTERS: { key: ReportStatus | 'all'; label: string }[] = [
  { key: 'open', label: 'Abiertos' },
  { key: 'reviewed', label: 'Revisados' },
  { key: 'actioned', label: 'Con acción' },
  { key: 'all', label: 'Todos' },
];

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Abierto',
  reviewed: 'Revisado',
  actioned: 'Con acción',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ModerationScreen() {
  const session = useSession();
  const [tab, setTab] = useState<'reports' | 'feedback'>('reports');
  const [filter, setFilter] = useState<ReportStatus | 'all'>('open');
  const [reports, setReports] = useState<ModerationReport[] | undefined>(undefined);
  const [feedback, setFeedback] = useState<FeedbackItem[] | undefined>(undefined);
  const [denied, setDenied] = useState(false);

  // Al cambiar de filtro se mantiene la lista anterior mientras llega la
  // nueva: mejor eso que un parpadeo de rueda cada vez que se toca un chip.
  const load = useCallback(() => {
    if (!session) return;
    if (tab === 'reports') {
      fetchReports(filter)
        .then((rows) => {
          setDenied(false);
          setReports(rows);
        })
        // sin ser moderador la RLS no devuelve nada; es un estado, no un fallo
        .catch(() => {
          setDenied(true);
          setReports([]);
        });
    } else {
      fetchFeedback(filter)
        .then((rows) => {
          setDenied(false);
          setFeedback(rows);
        })
        // ídem, o migración 00050 sin aplicar: bandeja vacía con aviso
        .catch(() => {
          setDenied(true);
          setFeedback([]);
        });
    }
  }, [session, tab, filter]);

  useEffect(load, [load]);

  const mark = async (report: ModerationReport, status: ReportStatus) => {
    const previous = report.status;
    setReports((list) =>
      list?.map((r) => (r.id === report.id ? { ...r, status } : r))
    );
    try {
      await setReportStatus(report.id, status);
      // si el filtro ya no lo incluye, que desaparezca de la lista
      if (filter !== 'all' && filter !== status) {
        setReports((list) => list?.filter((r) => r.id !== report.id));
      }
    } catch (error) {
      setReports((list) =>
        list?.map((r) => (r.id === report.id ? { ...r, status: previous } : r))
      );
      showAlert('No se pudo marcar', error instanceof Error ? error.message : String(error));
    }
  };

  const markFeedback = async (item: FeedbackItem, status: ReportStatus) => {
    const previous = item.status;
    setFeedback((list) => list?.map((f) => (f.id === item.id ? { ...f, status } : f)));
    try {
      await setFeedbackStatus(item.id, status);
      if (filter !== 'all' && filter !== status) {
        setFeedback((list) => list?.filter((f) => f.id !== item.id));
      }
    } catch (error) {
      setFeedback((list) => list?.map((f) => (f.id === item.id ? { ...f, status: previous } : f)));
      showAlert('No se pudo marcar', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
          />
          <ScreenTitle>Moderación</ScreenTitle>
          <ScreenBlurb>
            Reportes y sugerencias de la comunidad. Marca cada uno cuando lo hayas mirado para que
            el resto del equipo no lo repase dos veces.
          </ScreenBlurb>

          <View style={styles.tabRow}>
            {(
              [
                { key: 'reports', label: 'Reportes' },
                { key: 'feedback', label: 'Sugerencias' },
              ] as const
            ).map((option) => (
              <Pressable
                key={option.key}
                accessibilityLabel={option.label}
                style={[styles.tab, tab === option.key && styles.tabActive]}
                onPress={() => setTab(option.key)}>
                <Text style={[styles.tabLabel, tab === option.key && styles.tabLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((option) => (
              <Pressable
                key={option.key}
                accessibilityLabel={`Ver ${option.label.toLowerCase()}`}
                style={[styles.filter, filter === option.key && styles.filterActive]}
                onPress={() => setFilter(option.key)}>
                <Text
                  style={[styles.filterLabel, filter === option.key && styles.filterLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === 'feedback' ? (
            feedback === undefined ? (
              <ActivityIndicator style={styles.loading} />
            ) : denied ? (
              <ThemedText type="small" style={styles.empty}>
                Esta bandeja es para el equipo de moderación.
              </ThemedText>
            ) : feedback.length === 0 ? (
              <ThemedText type="small" style={styles.empty}>
                Sin sugerencias en este estado.
              </ThemedText>
            ) : (
              feedback.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={styles.reason}>
                      {FEEDBACK_KINDS.find((k) => k.key === item.kind)?.label}
                    </Text>
                    <Text style={styles.status}>{STATUS_LABELS[item.status]}</Text>
                  </View>
                  <Text style={styles.target}>
                    {item.authorAlias ? item.authorAlias : 'Cuenta borrada'}
                    {' · '}
                    {formatDate(item.created_at)}
                  </Text>
                  <Text style={styles.details}>{item.body}</Text>
                  <View style={styles.actions}>
                    {item.status !== 'reviewed' && (
                      <Pressable onPress={() => markFeedback(item, 'reviewed')}>
                        <Text style={styles.link}>Marcar revisado</Text>
                      </Pressable>
                    )}
                    {item.status !== 'actioned' && (
                      <Pressable onPress={() => markFeedback(item, 'actioned')}>
                        <Text style={styles.link}>Marcar con acción</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
            )
          ) : reports === undefined ? (
            <ActivityIndicator style={styles.loading} />
          ) : denied ? (
            <ThemedText type="small" style={styles.empty}>
              Esta bandeja es para el equipo de moderación.
            </ThemedText>
          ) : reports.length === 0 ? (
            <ThemedText type="small" style={styles.empty}>
              Nada por aquí. Buena señal.
            </ThemedText>
          ) : (
            reports.map((report) => (
              <View key={report.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.reason}>{report.reason}</Text>
                  <Text style={styles.status}>{STATUS_LABELS[report.status]}</Text>
                </View>
                <Text style={styles.target}>
                  {report.reportedUserAlias
                    ? report.reportedUserAlias
                    : report.reportedGroupName
                      ? report.reportedGroupName
                      : 'Sin objetivo'}
                  {' · '}
                  {formatDate(report.created_at)}
                </Text>
                {report.messageExcerpt && (
                  <Text style={styles.excerpt} numberOfLines={6}>
                    «{report.messageExcerpt}»
                  </Text>
                )}
                {report.details && <Text style={styles.details}>{report.details}</Text>}
                <View style={styles.actions}>
                  {report.reportedUserId && (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/players/[id]',
                          params: { id: report.reportedUserId! },
                        })
                      }>
                      <Text style={styles.link}>Ver perfil</Text>
                    </Pressable>
                  )}
                  {report.status !== 'reviewed' && (
                    <Pressable onPress={() => mark(report, 'reviewed')}>
                      <Text style={styles.link}>Marcar revisado</Text>
                    </Pressable>
                  )}
                  {report.status !== 'actioned' && (
                    <Pressable onPress={() => mark(report, 'actioned')}>
                      <Text style={styles.link}>Marcar con acción</Text>
                    </Pressable>
                  )}
                </View>
              </View>
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
  empty: { textAlign: 'center', marginTop: Spacing.four },
  tabRow: { flexDirection: 'row', gap: Spacing.two },
  tab: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    paddingVertical: 10,
    backgroundColor: Rolder.surface,
  },
  tabActive: { borderColor: Rolder.violetSoft, backgroundColor: 'rgba(199,125,255,0.18)' },
  tabLabel: { color: Rolder.textSecondary, fontSize: 13.5, fontFamily: RolderFonts.semibold },
  tabLabelActive: { color: '#fff' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filter: {
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  filterActive: { borderColor: Rolder.violetSoft, backgroundColor: 'rgba(199,125,255,0.18)' },
  filterLabel: { color: Rolder.textSecondary, fontSize: 12.5, fontFamily: RolderFonts.semibold },
  filterLabelActive: { color: '#fff' },
  card: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    gap: Spacing.two,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  reason: { color: '#fff', fontSize: 15, fontFamily: RolderFonts.semibold, fontWeight: '600' },
  status: { color: Rolder.textSecondary, fontSize: 12 },
  target: { color: Rolder.textSecondary, fontSize: 12.5 },
  excerpt: {
    color: '#fff',
    fontSize: 13,
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: Rolder.violetSoft,
    paddingLeft: 10,
  },
  details: { color: Rolder.textSecondary, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  link: { color: Rolder.violetSoft, fontSize: 13, fontFamily: RolderFonts.semibold },
});
