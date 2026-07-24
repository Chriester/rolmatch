import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { showAlert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { signInWithDiscord, signInWithEmail } from '@/lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDiscord = async () => {
    setBusy(true);
    try {
      await signInWithDiscord();
    } catch (error) {
      showAlert('Error al iniciar sesión', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await signInWithEmail(email.trim());
      showAlert('Revisa tu correo', 'Te hemos enviado un enlace para entrar.');
    } catch (error) {
      showAlert('Error al enviar el enlace', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          RolMatch
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Encuentra mesa. Encuentra grupo. Juega.
        </ThemedText>

        <Pressable
          style={[styles.discordButton, busy && styles.disabled]}
          onPress={handleDiscord}
          disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.discordLabel}>Continuar con Discord</ThemedText>
          )}
        </Pressable>

        <ThemedText type="small" style={styles.divider}>
          o con tu correo
        </ThemedText>

        <TextInput
          style={styles.input}
          placeholder="tu@correo.com"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <Pressable
          style={[styles.emailButton, busy && styles.disabled]}
          onPress={handleEmail}
          disabled={busy}>
          <ThemedText>Enviarme enlace de acceso</ThemedText>
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  discordButton: {
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  discordLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  divider: {
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    color: '#888',
  },
  emailButton: {
    borderWidth: 1,
    borderColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});
