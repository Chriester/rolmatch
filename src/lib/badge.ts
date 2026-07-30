// Badge numérico en el icono de la app: Android vía expo-notifications
// (según launcher) y web/PWA vía la Badging API (Chrome/Edge y PWA de iOS
// 16.4+). Best-effort: sin soporte, no pasa nada.

import { Platform } from 'react-native';

export async function setAppBadge(count: number) {
  try {
    if (Platform.OS === 'web') {
      const nav = navigator as {
        setAppBadge?: (n: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
      };
      if (count > 0) await nav.setAppBadge?.(count);
      else await nav.clearAppBadge?.();
      return;
    }
    const Notifications = await import('expo-notifications');
    await Notifications.setBadgeCountAsync(count);
  } catch {
    // plataforma sin badge: silencio
  }
}
