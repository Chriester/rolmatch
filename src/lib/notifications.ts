import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Con la app en primer plano las notificaciones se muestran igualmente
// (banner discreto, sin sonido); en web no hay push.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

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
      // MAX = heads-up: banner flotante + vibración, como una app de mensajería
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificaciones',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C77DFF',
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

/**
 * Al tocar una notificación, navega a la ruta que manda el servidor en
 * data.url (p. ej. /groups/<id>/chat). Cubre app abierta, en segundo plano
 * y arranque en frío desde la notificación.
 */
export function useNotificationTapRouting() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const route = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) {
        router.push(url as never);
      }
    };
    Notifications.getLastNotificationResponseAsync().then(route).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(route);
    return () => subscription.remove();
  }, []);
}
