import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { REPORT_REASONS, submitReport } from '@/lib/moderation';

export default function ReportScreen() {
  const { kind, id, name } = useLocalSearchParams<{
    kind: 'user' | 'group';
    id: string;
    name?: string;
  }>();
  const session = useSession();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!session || !kind || !id || !reason) return;
    setBusy(true);
    try {
      await submitReport(session.user.id, { kind, id }, reason, details.trim() || null);
      showAlert(
        'Reporte enviado',
        'Gracias por avisar. El equipo de moderación lo revisará.'
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
            Reportar {kind === 'group' ? 'mesa' : 'usuario'}
          </ThemedText>
          {name && <ThemedText>{name}</ThemedText>}

          <ThemedText type="small">¿Qué ha pasado?</ThemedText>
          <View style={styles.chipRow}>
            {REPORT_REASONS.map((r) => (
              <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>

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
