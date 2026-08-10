import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Rolder, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { REPORT_REASONS, blockUser, submitReport } from '@/lib/moderation';

export default function ReportScreen() {
  const { kind, id, name, excerpt, authorId } = useLocalSearchParams<{
    kind: 'user' | 'group' | 'message';
    id: string;
    name?: string;
    /** texto del mensaje reportado: se guarda como prueba (migr. 00045) */
    excerpt?: string;
    /** quién lo escribió, para poder actuar sobre la persona */
    authorId?: string;
  }>();
  const session = useSession();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!session || !kind || !id || !reason) return;
    setBusy(true);
    try {
      const target =
        kind === 'message'
          ? ({ kind, id, excerpt: excerpt ?? null, authorId: authorId ?? null } as const)
          : ({ kind, id } as const);
      await submitReport(session.user.id, target, reason, details.trim() || null);
      const blockTarget = kind === 'user' ? id : kind === 'message' ? authorId : null;
      if (alsoBlock && blockTarget) {
        await blockUser(session.user.id, blockTarget);
      }
      showAlert(
        'Reporte enviado',
        alsoBlock && kind === 'user'
          ? 'Gracias por avisar. Además, esa persona ya no puede verte ni escribirte.'
          : 'Gracias por avisar. El equipo de moderación lo revisará.'
      );
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (error) {
      showAlert('No se pudo enviar', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader
            onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <ThemedText type="title">
            Reportar {kind === 'group' ? 'mesa' : kind === 'message' ? 'mensaje' : 'usuario'}
          </ThemedText>
          {name && <ThemedText>{name}</ThemedText>}
          {kind === 'message' && excerpt && (
            <ThemedText style={styles.excerpt} numberOfLines={6}>
              «{excerpt}»
            </ThemedText>
          )}

          <ThemedText type="small">¿Qué ha pasado?</ThemedText>
          <View style={styles.chipRow}>
            {REPORT_REASONS.map((r) => (
              <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>

          {(kind === 'user' || (kind === 'message' && authorId)) && (
            <View style={styles.blockRow}>
              <View style={styles.blockLabel}>
                <ThemedText>Bloquear también</ThemedText>
                <ThemedText type="small">
                  Dejaréis de veros en feeds y chats, en ambas direcciones
                </ThemedText>
              </View>
              <Switch value={alsoBlock} onValueChange={setAlsoBlock} />
            </View>
          )}

          <ThemedText type="small">Cuéntanos más (opcional)</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={details}
            onChangeText={setDetails}
            placeholder="Detalles que ayuden a moderación…"
            placeholderTextColor="#888"
            multiline
          />

          <Pressable
            style={[styles.submitButton, (!reason || busy) && styles.disabled]}
            onPress={handleSubmit}
            disabled={!reason || busy}>
            <ThemedText style={styles.submitLabel}>
              {busy ? 'Enviando…' : 'Enviar reporte'}
            </ThemedText>
          </Pressable>
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
  },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  excerpt: {
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: Rolder.violetSoft,
    paddingLeft: 10,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  blockLabel: {
    flex: 1,
    gap: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    color: '#888',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#d9534f',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  submitLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
