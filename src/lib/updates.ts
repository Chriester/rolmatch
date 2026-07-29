// OTA determinista: en vez de "descarga en background y aplica en el
// SIGUIENTE arranque" (el default de expo-updates, que confunde — parece
// que la app no se actualiza), comprobamos, descargamos y recargamos en el
// momento: al arrancar y también cada vez que la app vuelve a primer plano
// (con un mínimo entre comprobaciones para no machacar el servidor).

import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

const FOREGROUND_MIN_MS = 5 * 60_000;

/**
 * Devuelve true mientras se descarga y aplica una actualización — el layout
 * raíz enseña el overlay «afilando los dados» para que no parezca colgado.
 */
export function useOtaUpdates(): boolean {
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__) return;
    let lastCheck = 0;

    const check = async () => {
      if (Date.now() - lastCheck < FOREGROUND_MIN_MS) return;
      lastCheck = Date.now();
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          setUpdating(true);
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // sin red o servidor caído: seguimos con lo embebido/cacheado
        setUpdating(false);
      }
    };

    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  return updating;
}
