import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Nunito_900Black } from '@expo-google-fonts/nunito';
import { Outfit_700Bold } from '@expo-google-fonts/outfit';
import { DarkTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Rolder } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { track } from '@/lib/analytics';
import { ensureCommunityMembership } from '@/lib/auth';
import { DISCORD_ENABLED } from '@/lib/config';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { ErrorBoundary } from '@/components/error-boundary';
import { RouteFade } from '@/components/route-fade';
import { UpdateBanner } from '@/components/update-banner';
import { UpdateOverlay } from '@/components/update-overlay';
import { useNotificationTapRouting } from '@/lib/notifications';
import { useQuickActions } from '@/lib/quick-actions';
import { useOtaUpdates } from '@/lib/updates';
import { useWebVersionCheck } from '@/lib/version-check';
import { setupWebPwa } from '@/lib/web-push';
import { setupWebTweaks } from '@/lib/web-tweaks';

SplashScreen.preventAutoHideAsync();

// rolder es dark-only: tema de navegación siempre oscuro, fondo de página propio
const RolderNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Rolder.page,
    card: Rolder.surface,
    primary: Rolder.violet,
  },
};

export default function RootLayout() {
  const session = useSession();
  useNotificationTapRouting();
  const updating = useOtaUpdates();
  const webUpdateReady = useWebVersionCheck();
  useQuickActions();
  // Tipografía Roldr: Manrope (cuerpo/UI), Outfit (display), JetBrains Mono
  // (notación de dados). Nunito sigue SOLO en los sellos ¡CRÍTICO!/PIFIA
  // (excepción deliberada — plan F2, pendiente de validar con la diseñadora).
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    Nunito_900Black,
  });

  useEffect(() => {
    if (session !== undefined && fontsLoaded) {
      SplashScreen.hideAsync();
    }
    // Tras un login OAuth fresco, el bot une al usuario al servidor comunitario
    if (DISCORD_ENABLED && session?.provider_token) {
      ensureCommunityMembership(session.provider_token);
    }
    // Web: manifest PWA + refresco silencioso de la suscripción push
    setupWebPwa(session?.user.id ?? null);
    // Web: sin arrastre nativo de imágenes (rompía el swipe con ratón)
    setupWebTweaks();
  }, [session, fontsLoaded]);

  // Una apertura por sesión de app: es la base de las cohortes de retención,
  // el único KPI del PRD que no se puede deducir de las tablas de siempre.
  const openTracked = useRef(false);
  useEffect(() => {
    if (!session || openTracked.current) return;
    openTracked.current = true;
    track(session.user.id, 'app_open', { platform: Platform.OS });
  }, [session]);

  // Deep link tras login (web): quien llega a un enlace compartido sin
  // sesión pasa por el login — guardamos su destino y lo restauramos al
  // volver del OAuth (el callback aterriza en «/»).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!session) {
      const path = window.location.pathname + window.location.search;
      if (path !== '/' && !path.startsWith('/login') && !path.startsWith('/auth')) {
        localStorage.setItem('rolder-ruta-pendiente', path);
      }
      return;
    }
    const pending = localStorage.getItem('rolder-ruta-pendiente');
    if (pending) {
      localStorage.removeItem('rolder-ruta-pendiente');
      if (pending !== window.location.pathname) {
        router.replace(pending as never);
      }
    }
  }, [session]);

  // Esperando a restaurar la sesión persistida y las fuentes
  if (session === undefined || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <ThemeProvider value={RolderNavTheme}>
        <View style={styles.appRoot}>
          <RouteFade style={styles.stackArea}>
            <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="tutorial" />
              <Stack.Screen name="matches" />
              <Stack.Screen name="promo" />
              <Stack.Screen name="report" />
              <Stack.Screen name="rate" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="feedback" />
              <Stack.Screen name="blocked" />
              <Stack.Screen name="moderation" />
              <Stack.Screen name="novedades" />
              <Stack.Screen name="xp" />
              <Stack.Screen name="players/[id]" />
              <Stack.Screen name="dm/[id]" />
              <Stack.Screen name="characters/index" />
              <Stack.Screen name="characters/new" />
              <Stack.Screen name="characters/[id]" />
              <Stack.Screen name="groups/new" />
              <Stack.Screen name="groups/[id]/candidates" />
              <Stack.Screen name="groups/[id]/edit" />
              <Stack.Screen name="groups/[id]/chat" />
              <Stack.Screen name="groups/[id]/schedule" />
            </Stack.Protected>
              <Stack.Protected guard={!session}>
                <Stack.Screen name="login" />
              </Stack.Protected>
              {/* Fuera de los dos guardas: destinos de enlaces compartidos —
                  la propia pantalla decide qué enseñar según haya sesión o no. */}
              <Stack.Screen name="groups/[id]/index" />
              {/* Crónica pública de campaña (migr. 00060): 100% sin sesión */}
              <Stack.Screen name="campana/[id]" />
            </Stack>
          </RouteFade>
          {/* Espacio real (no flotante) reservado para el escudo/dado/chat:
              se ve en TODAS las pantallas, no solo dentro de (tabs) — la
              propia barra decide cuándo ocultarse (sin sesión, onboarding). */}
          <BottomNavBar />
        </View>
        {updating && <UpdateOverlay />}
        {webUpdateReady && <UpdateBanner />}
      </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    // detrás del RouteFade tiene que haber página oscura: al bajar la
    // opacidad del Stack, sin esto asomaba el blanco del documento (web)
    // y el fundido era un destello que cegaba
    backgroundColor: Rolder.page,
  },
  stackArea: {
    flex: 1,
  },
});
