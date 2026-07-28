// OTA determinista: en vez de "descarga en background y aplica en el
// SIGUIENTE arranque" (el default de expo-updates, que confunde — parece
// que la app no se actualiza), al arrancar comprobamos, descargamos y
// recargamos en el momento. La recarga ocurre en los primeros segundos,
// antes de que el usuario esté haciendo nada.

import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Devuelve true mientras se descarga y aplica una actualización — el layout
 * raíz enseña el overlay «afilando los dados» para que no parezca colgado.
 */
export function useOtaUpdates(): boolean {
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || __DEV__) return;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          setUpdating(true);
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // sin red o servidor caído: seguimos con lo embebido/cacheado
        setUpdating(false);
      }
    })();
  }, []);

  return updating;
}
