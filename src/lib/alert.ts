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
