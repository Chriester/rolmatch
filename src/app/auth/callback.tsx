import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useSession } from '@/hooks/use-session';

/**
 * Destino del redirect de OAuth/magic link en web.
 * supabase-js procesa el código de la URL (detectSessionInUrl) y,
 * en cuanto hay sesión, entramos a la app.
 */
export default function AuthCallback() {
  const session = useSession();

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator />
    </ThemedView>
  );
}
