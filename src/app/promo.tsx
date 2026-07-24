// Canjear código promocional: la vía cómoda de dar premium a testers —
// se comparte un código y cada uno lo canjea aquí.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { redeemPromoCode } from '@/lib/premium';

export default function PromoScreen() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await redeemPromoCode(code);
      showAlert('✨ ¡Premium activado!', 'Rewind, likes recibidos y boost desbloqueados. A jugar.');
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (error) {
      showAlert('No se pudo canjear', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <ThemedText type="title">✨ Canjear código</ThemedText>
        <ThemedText type="small">
          ¿Tienes un código de tester o promoción? Actívalo aquí y desbloquea las
          funciones premium.
        </ThemedText>

        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="CÓDIGO"
          placeholderTextColor="#888"
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Pressable
          style={[styles.button, (!code.trim() || busy) && styles.disabled]}
          onPress={handleRedeem}
          disabled={!code.trim() || busy}>
          <ThemedText style={styles.buttonLabel}>{busy ? 'Canjeando…' : 'Canjear'}</ThemedText>
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
  input: {
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    color: '#888',
    fontSize: 18,
    letterSpacing: 3,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#F5A623',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#1c1d22',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
