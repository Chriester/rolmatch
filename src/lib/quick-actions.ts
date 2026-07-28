// Accesos directos del icono de la app (mantener pulsado → atajos).
// Import dinámico + try/catch: web y binarios sin el módulo lo ignoran.

import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const SHORTCUTS = [
  { id: 'feed', title: '🎲 Feed', params: { href: '/' } },
  { id: 'chats', title: '💬 Mis chats', params: { href: '/chats' } },
  { id: 'groups', title: '🛡️ Mis mesas', params: { href: '/groups' } },
];

function routeTo(action?: { params?: Record<string, unknown> | null } | null) {
  const href = action?.params?.href;
  if (typeof href === 'string' && href.startsWith('/')) {
    router.push(href as never);
  }
}

export function useQuickActions() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let subscription: { remove: () => void } | undefined;
    (async () => {
      try {
        const QuickActions = await import('expo-quick-actions');
        await QuickActions.setItems(SHORTCUTS);
        // Arranque en frío desde un atajo
        routeTo(QuickActions.initial);
        // App ya viva
        subscription = QuickActions.addListener(routeTo);
      } catch {
        // módulo no disponible (binario viejo): sin atajos y sin drama
      }
    })();
    return () => subscription?.remove();
  }, []);
}
