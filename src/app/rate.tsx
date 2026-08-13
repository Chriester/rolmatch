// Valoración post-sesión entre miembros de una mesa (§5 Fase 3): fiabilidad
// 1-5 y asistencia. Sin nota pública agresiva: lo individual es privado y
// solo el agregado alimenta el matching.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { submitRating } from '@/lib/ratings';

const LABELS = ['', 'Nunca aparece', 'Falla a menudo', 'Cumple', 'Muy fiable', 'Roca sólida'];

export default function RateScreen() {
  const { userId, alias, groupId } = useLocalSearchParams<{
    userId: string;
    alias?: string;
    groupId?: string;
  }>();
  const session = useSession();
  const [reliability, setReliability] = useState(0);
  const [attended, setAttended] = useState(true);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!session || !userId || reliability === 0) return;
    setBusy(true);
    try {
      await submitRating(
        session.user.id,
        userId,
        groupId ?? null,
        reliability,
        attended,
        comment.trim() || null
      );
      showAlert('Valoración enviada', 'Gracias — la fiabilidad ayuda a que los matches cuajen.');
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
        <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <ThemedText type="title">Valorar a {alias ?? 'este miembro'}</ThemedText>

        <ThemedText type="small">¿Cómo de fiable es en las sesiones?</ThemedText>
        <View style={styles.diceRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              onPress={() => setReliability(value)}
              accessibilityLabel={`${value} de 5`}>
              <Text style={[styles.dice, value > reliability && styles.diceOff]}>🎲</Text>
            </Pressable>
          ))}
        </View>
        {reliability > 0 && (
          <ThemedText type="small" style={styles.diceLabel}>
            {LABELS[reliability]}
          </ThemedText>
        )}

        <View style={styles.switchRow}>
          <ThemedText>Asistió a la última sesión</ThemedText>
          <Switch value={attended} onValueChange={setAttended} />
        </View>

        <ThemedText type="small">Comentario (opcional, privado)</ThemedText>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={comment}
          onChangeText={setComment}
          placeholder="Solo lo veréis ambos"
          placeholderTextColor="#888"
          multiline
        />

        <Pressable
          style={[styles.submitButton, (reliability === 0 || busy) && styles.disabled]}
          onPress={handleSubmit}
          disabled={reliability === 0 || busy}>
          <ThemedText style={styles.submitLabel}>
            {busy ? 'Enviando…' : 'Enviar valoración'}
          </ThemedText>
        </Pressable>
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  diceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dice: {
    fontSize: 40,
  },
  diceOff: {
    opacity: 0.25,
  },
  diceLabel: {
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#5D4A93',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
