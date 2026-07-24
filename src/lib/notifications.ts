import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

/**
 * Registra el token de Expo Push del dispositivo (§8.6 del PRD).
 * - En web no hay push: el aviso de match llega por Discord.
 * - En Expo Go (SDK 53+) el push remoto no está disponible; hace falta un
 *   development build con proyecto EAS. Por eso todo va en try/catch: si no
 *   se puede registrar, la app sigue funcionando sin push.
 */
export async function registerPushToken(userId: string) {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificaciones',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await supabase.from('push_tokens').upsert({
      token,
      user_id: userId,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Sin EAS o en Expo Go: seguimos sin push, no es un error de la app.
  }
}
