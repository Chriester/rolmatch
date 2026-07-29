// Web Push para la versión web — el único canal de notificaciones de los
// usuarios de iOS (sin app en App Store). Requisitos de Safari iOS ≥ 16.4:
// la app debe estar añadida a la pantalla de inicio (PWA standalone) y el
// permiso debe pedirse desde un gesto del usuario (botón en Opciones).
// Las suscripciones van a web_push_subscriptions (migr. 00024); el envío lo
// hacen push-notify y push-reminders con la clave privada VAPID.

import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Clave pública VAPID — es pública por diseño; la privada vive como secret
// de las Edge Functions (VAPID_PRIVATE_KEY).
export const VAPID_PUBLIC_KEY =
  'BBNJD_C2usP--UtS1sMIjhonYI29SyymoD5DAs8Pry77TvC7MTVfG5mgonImqpm34l4isWZ7AqZgl8unElCklwo';

export type WebPushState =
  | 'unsupported' // nativo, o navegador sin Push API
  | 'ios-install' // iPhone/iPad en Safari: falta añadir a pantalla de inicio
  | 'ready' // soportado, falta pedir permiso
  | 'granted'
  | 'denied';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

function isIos(): boolean {
  return isWeb && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    isWeb &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function webPushState(): WebPushState {
  if (!isWeb) return 'unsupported';
  if (isIos() && !isStandalone()) return 'ios-install';
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function saveSubscription(userId: string, sub: PushSubscription) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  const { error } = await supabase.from('web_push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw error;
}

/**
 * Pide permiso y suscribe este navegador. Llamar SOLO desde un gesto del
 * usuario (Safari lo exige). Devuelve el estado resultante.
 */
export async function enableWebPush(userId: string): Promise<WebPushState> {
  const state = webPushState();
  if (state !== 'ready' && state !== 'granted') return state;
  const registration = await navigator.serviceWorker.register('/sw.js');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return webPushState();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    }));
  await saveSubscription(userId, subscription);
  return 'granted';
}

/**
 * Arranque en web: inyecta el manifest PWA y las metas de iOS, y si el
 * permiso ya está concedido refresca la suscripción en silencio (los push
 * services pueden rotarla). No pide permiso nunca.
 */
export function setupWebPwa(userId: string | null) {
  if (!isWeb) return;
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
    const capable = document.createElement('meta');
    capable.name = 'apple-mobile-web-app-capable';
    capable.content = 'yes';
    document.head.appendChild(capable);
    const title = document.createElement('meta');
    title.name = 'apple-mobile-web-app-title';
    title.content = 'rolder';
    document.head.appendChild(title);
  }
  if (userId && webPushState() === 'granted') {
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await saveSubscription(userId, subscription);
      })
      .catch(() => {});
  }
}
