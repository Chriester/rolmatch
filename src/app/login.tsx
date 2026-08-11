// Login rolder (handoff §6): logo + wordmark centrados, botón Discord,
// acceso por enlace mágico y nota legal.

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { humanizeError, showAlert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RolderLogo, RolderWordmark } from '@/components/brand';
import { ThemedView } from '@/components/themed-view';
import { Rolder, RolderFonts } from '@/constants/theme';
import { signInWithDiscord, signInWithEmail, signInWithGoogle } from '@/lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleDiscord = async () => {
    setBusy(true);
    try {
      await signInWithDiscord();
    } catch (error) {
      showAlert('Error al iniciar sesión', humanizeError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      showAlert('Error al iniciar sesión', humanizeError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } catch (error) {
      showAlert('Error al enviar el enlace', humanizeError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brand}>
          <RolderLogo width={40} />
          <RolderWordmark size={38} />
        </View>
        <Text style={styles.tagline}>Encuentra mesa. Encuentra grupo. Juega.</Text>

        <Pressable
          style={[styles.discordButton, busy && styles.disabled]}
          onPress={handleDiscord}
          disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.discordLabel}>🎮 Continuar con Discord</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.googleButton, busy && styles.disabled]}
          onPress={handleGoogle}
          disabled={busy}>
          <Text style={styles.googleLabel}>
            <Text style={styles.googleG}>G</Text>  Continuar con Google
          </Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o con tu correo</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="tu@correo.com"
          placeholderTextColor="rgba(255,255,255,0.4)"
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
          <Text style={styles.emailLabel}>Enviarme enlace de acceso</Text>
        </Pressable>

        {sent && (
          <Text style={styles.sentNotice}>✓ Enlace enviado — revisa tu correo para entrar.</Text>
        )}

        <Text style={styles.legal}>
          Usamos tu cuenta solo para verificar que eres una persona real. Nunca publicamos nada
          en tu nombre.
        </Text>
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
    paddingHorizontal: 32,
    gap: 14,
    maxWidth: 460,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  tagline: {
    color: Rolder.textSecondary,
    fontSize: 15,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginBottom: 18,
  },
  discordButton: {
    backgroundColor: Rolder.discord,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  discordLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  googleLabel: {
    color: '#1F1F1F',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  googleG: {
    color: '#4285F4',
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
  },
  input: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.regular,
  },
  emailButton: {
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.8)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  emailLabel: {
    color: Rolder.violetSofter,
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  sentNotice: {
    color: Rolder.like,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    textAlign: 'center',
  },
  legal: {
    color: Rolder.textTertiary,
    fontSize: 11,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  disabled: {
    opacity: 0.6,
  },
});
