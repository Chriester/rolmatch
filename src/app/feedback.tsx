// Enviar sugerencia o problema desde dentro de la app (migr. 00050).
// Antes esto llegaba por capturas de WhatsApp o no llegaba: cada fricción
// que un tester no cuenta es un usuario que se pierde en silencio.

import { router } from 'expo-router';
import { PartyPopper } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton, ScreenBlurb, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, RolderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { showAlert } from '@/lib/alert';
import { FEEDBACK_KINDS, sendFeedback, type FeedbackKind } from '@/lib/feedback';

export default function FeedbackScreen() {
  const session = useSession();
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!session || body.trim().length < 3 || busy) return;
    setBusy(true);
    try {
      await sendFeedback(session.user.id, kind, body);
      setSent(true);
    } catch (error) {
      showAlert('No se pudo enviar', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} />
          <ScreenTitle>Cuéntanos</ScreenTitle>
          <ScreenBlurb>
            Ideas, cosas que fallan, cosas que sobran. Lo leemos todo — así se decide qué toca
            arreglar antes.
          </ScreenBlurb>

          {sent ? (
            <View style={styles.thanksBox}>
              <PartyPopper color={Rolder.textTertiary} size={44} strokeWidth={2} />
              <Text style={styles.thanksTitle}>Recibido, ¡gracias!</Text>
              <Text style={styles.thanksBody}>
                Tu mensaje ya está en la bandeja del equipo. Si quieres contar otra cosa, aquí
                estaremos.
              </Text>
              <PrimaryButton label="Volver" onPress={() => router.back()} />
            </View>
          ) : (
            <>
              <View style={styles.kindRow}>
                {FEEDBACK_KINDS.map((option) => (
                  <Pressable
                    key={option.key}
                    accessibilityLabel={option.label}
                    accessibilityRole="radio"
                    aria-selected={kind === option.key}
                    style={[styles.kind, kind === option.key && styles.kindActive]}
                    onPress={() => setKind(option.key)}>
                    <Text style={[styles.kindLabel, kind === option.key && styles.kindLabelActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                multiline
                value={body}
                onChangeText={setBody}
                maxLength={2000}
                placeholder={
                  kind === 'problema'
                    ? '¿Qué ha pasado y en qué pantalla? Cuanto más detalle, antes lo cazamos.'
                    : '¿Qué tienes en mente?'
                }
                placeholderTextColor={Rolder.textTertiary}
                accessibilityLabel="Tu mensaje"
              />

              <PrimaryButton
                label={busy ? 'Enviando…' : 'Enviar'}
                disabled={busy || body.trim().length < 3}
                onPress={handleSend}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, width: '100%' },
  content: { flex: 1, padding: 20, gap: Spacing.three },
  kindRow: { flexDirection: 'row', gap: Spacing.two },
  kind: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: RolderRadius.md,
    paddingVertical: 12,
    backgroundColor: Rolder.surface,
  },
  kindActive: { borderColor: Rolder.violetSoft, backgroundColor: 'rgba(199,125,255,0.18)' },
  kindLabel: { color: Rolder.textSecondary, fontSize: 12.5, fontFamily: RolderFonts.semibold },
  kindLabelActive: { color: '#fff' },
  input: {
    minHeight: 140,
    textAlignVertical: 'top',
    color: '#fff',
    fontSize: 14.5,
    fontFamily: RolderFonts.regular,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    lineHeight: 20,
  },
  thanksBox: { alignItems: 'center', gap: Spacing.three, marginTop: Spacing.four },
  thanksTitle: { color: '#fff', fontSize: 19, fontFamily: RolderFonts.semibold, fontWeight: '700' },
  thanksBody: {
    color: Rolder.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
});
