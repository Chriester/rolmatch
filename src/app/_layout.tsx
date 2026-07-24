import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useSession } from '@/hooks/use-session';
import { ensureCommunityMembership } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useSession();

  useEffect(() => {
    if (session !== undefined) {
      SplashScreen.hideAsync();
    }
    // Tras un login OAuth fresco, el bot une al usuario al servidor comunitario
    if (session?.provider_token) {
      ensureCommunityMembership(session.provider_token);
    }
  }, [session]);

  // Esperando a restaurar la sesión persistida
  if (session === undefined) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
