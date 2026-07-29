// Aviso de «versión nueva» en la web (incluida la PWA de iPhone): el deploy
// escribe /version.json con el sha del commit y compila el bundle con ese
// mismo sha en EXPO_PUBLIC_BUILD_SHA. Este hook los compara cada pocos
// minutos y al volver la pestaña/PWA a primer plano — justo el momento en
// que un usuario de iPhone reabre la app.

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const BUILD_SHA = process.env.EXPO_PUBLIC_BUILD_SHA;
const CHECK_EVERY_MS = 5 * 60_000;

/** true cuando producción tiene un bundle más nuevo que el que corre. */
export function useWebVersionCheck(): boolean {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    // en dev y en nativo no aplica (el APK va por OTA de expo-updates)
    if (Platform.OS !== 'web' || !BUILD_SHA || __DEV__) return;
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        if (!response.ok) return;
        const { sha } = (await response.json()) as { sha?: string };
        if (!cancelled && sha && sha !== BUILD_SHA) setStale(true);
      } catch {
        // sin red: lo reintentará el intervalo
      }
    };

    const interval = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    check();
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return stale;
}
