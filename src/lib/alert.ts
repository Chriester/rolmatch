import { Alert, Platform } from 'react-native';

/**
 * Alert.alert no está implementado en react-native-web (no hace nada).
 * En web usamos window.alert; en nativo, el Alert normal.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/**
 * Traduce errores técnicos (Postgres/Supabase/red) a una frase que
 * cualquiera pueda entender, para no enseñar jerga cruda en un showAlert.
 * Mismo espíritu que el 42501 ya traducido a mano en dm.ts, pero
 * reutilizable: si no reconoce el error, deja pasar el mensaje original
 * (mejor punto de partida real que un genérico que no dice nada).
 */
export function humanizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code;

  if (code === '42501') return 'No tienes permiso para hacer esto.';
  if (code === 'PGRST301' || /jwt expired/i.test(raw)) {
    return 'Tu sesión caducó. Vuelve a entrar.';
  }
  if (/failed to fetch|network request failed|networkerror/i.test(raw)) {
    return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  }
  return raw;
}

/**
 * Confirmación antes de una acción destructiva. Resuelve true si el usuario
 * confirma. En web usa window.confirm; en nativo, Alert con dos botones.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'Sí, seguir'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
