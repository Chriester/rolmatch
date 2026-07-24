import {
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/sora';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Rolder } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { ensureCommunityMembership } from '@/lib/auth';

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
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Nunito_900Black,
  });

  useEffect(() => {
    if (session !== undefined && fontsLoaded) {
      SplashScreen.hideAsync();
    }
    // Tras un login OAuth fresco, el bot une al usuario al servidor comunitario
    if (session?.provider_token) {
      ensureCommunityMembership(session.provider_token);
    }
  }, [session, fontsLoaded]);

  // Esperando a restaurar la sesión persistida y las fuentes
  if (session === undefined || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={RolderNavTheme}>
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="matches" />
          <Stack.Screen name="likes" />
          <Stack.Screen name="promo" />
          <Stack.Screen name="report" />
          <Stack.Screen name="rate" />
          <Stack.Screen name="characters/index" />
          <Stack.Screen name="characters/new" />
          <Stack.Screen name="characters/[id]" />
          <Stack.Screen name="groups/index" />
          <Stack.Screen name="groups/new" />
          <Stack.Screen name="groups/[id]/index" />
          <Stack.Screen name="groups/[id]/candidates" />
        </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
