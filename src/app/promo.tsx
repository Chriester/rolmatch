// Canjear código (handoff §14): centrado, input uppercase y botón con
// gradiente violeta; éxito verde inline.

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { showAlert } from '@/lib/alert';
import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { redeemPromoCode } from '@/lib/premium';

export default function PromoScreen() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await redeemPromoCode(code);
      setRedeemed(true);
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

        <View style={styles.center}>
          {redeemed ? (
            <Animated.View
              entering={ZoomIn.springify().damping(12).reduceMotion(ReduceMotion.Never)}
              style={styles.successBox}>
              <Text style={styles.successEmoji}>✓</Text>
              <Text style={styles.successTitle}>¡Premium activado!</Text>
              <Text style={styles.blurb}>
                Rewind, likes recibidos y boost desbloqueados. A jugar.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.successButton, pressed && styles.pressed]}
                onPress={() => router.replace('/')}>
                <Text style={styles.successButtonLabel}>Volver al feed</Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <Text style={styles.sparkle}>✨</Text>
              <Text style={styles.title}>Canjear código</Text>
              <Text style={styles.blurb}>
                ¿Tienes un código de tester o promoción? Actívalo aquí y desbloquea las funciones
                premium.
              </Text>

              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="CÓDIGO"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <Pressable
                onPress={handleRedeem}
                disabled={!code.trim() || busy}
                style={({ pressed }) => [
                  styles.buttonWrap,
                  (!code.trim() || busy) && styles.disabled,
                  pressed && styles.pressed,
                ]}>
                <LinearGradient
                  colors={[Rolder.violet, Rolder.discord]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.button}>
                  <Text style={styles.buttonLabel}>{busy ? 'Canjeando…' : 'Canjear'}</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </View>
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
    maxWidth: 460,
    width: '100%',
    paddingHorizontal: 32,
    paddingTop: Spacing.two,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 80,
  },
  sparkle: {
    fontSize: 44,
    textAlign: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    textAlign: 'center',
  },
  blurb: {
    color: Rolder.textSecondary,
    fontSize: 13.5,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    lineHeight: 19,
  },
  input: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 18,
    fontFamily: RolderFonts.bold,
    letterSpacing: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  buttonWrap: {
    marginTop: 4,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    gap: 12,
  },
  successEmoji: {
    fontSize: 64,
    color: Rolder.like,
    fontFamily: RolderFonts.extrabold,
  },
  successTitle: {
    color: Rolder.like,
    fontSize: 22,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  successButton: {
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.8)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  successButtonLabel: {
    color: Rolder.violetSofter,
    fontSize: 14,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
