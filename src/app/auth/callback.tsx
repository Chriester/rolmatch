import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { OutlineButton } from '@/components/ui';
import { Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { supabase } from '@/lib/supabase';

/**
 * Destino del redirect de OAuth/magic link.
 * - Web: supabase-js procesa el código de la URL solo (detectSessionInUrl)
 *   y aquí basta con esperar a que aparezca la sesión.
 * - Nativo: detectSessionInUrl está APAGADO (supabase.ts), así que el deep
 *   link del magic link (roldr://auth/callback?code=…) llega con el code
 *   sin canjear — se canjea aquí. El OAuth nativo NO pasa por esta pantalla
 *   (canjea dentro de signInWithProvider); sin este canje, entrar por email
 *   desde el APK dejaba un spinner infinito.
 */
export default function AuthCallback() {
  const session = useSession();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  // el error que ya viene en la URL (enlace caducado…) se deriva en render;
  // setState solo para el fallo asíncrono del canje (regla del compiler)
  const providerError =
    typeof params.error_description === 'string' && params.error_description
      ? params.error_description
      : null;
  const [exchangeFailed, setExchangeFailed] = useState(false);
  const exchanged = useRef(false);
  const error = providerError
    ? providerError
    : exchangeFailed
      ? 'No se pudo completar el acceso. Pide el enlace desde este mismo dispositivo y ábrelo aquí, o vuelve a intentarlo.'
      : null;

  useEffect(() => {
    if (Platform.OS === 'web' || session || exchanged.current || providerError) return;
    const code = typeof params.code === 'string' ? params.code : null;
    if (!code) return; // sin code no hay nada que canjear: esperamos sesión
    exchanged.current = true;
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      // El caso típico de fallo: el enlace se pidió desde OTRO dispositivo o
      // navegador (PKCE guarda el verifier localmente) o ya caducó.
      if (exchangeError) setExchangeFailed(true);
    });
  }, [session, params.code, providerError]);

  if (session) {
    return <Redirect href="/" />;
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <Text style={styles.errorTitle}>El enlace no ha funcionado</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <OutlineButton label="Volver al login" onPress={() => router.replace('/login')} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorDetail: {
    color: Rolder.textSecondary,
    fontSize: 14,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});
