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
