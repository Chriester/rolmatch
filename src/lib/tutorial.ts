// Flag local de "tutorial visto": por dispositivo a propósito (si entras en
// otro móvil, verlo otra vez no hace daño y nos ahorra una columna en la DB).

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rolder-tutorial-visto';

export async function shouldShowTutorial(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === null;
  } catch {
    return false;
  }
}

export async function markTutorialSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // sin storage (modo privado, etc.): no pasa nada, se verá otra vez
  }
}

/** Guías por pantalla (misma filosofía, un flag por clave). */
export async function shouldShowCoach(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(`rolder-coach-${key}`)) === null;
  } catch {
    return false;
  }
}

export async function markCoachSeen(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`rolder-coach-${key}`, '1');
  } catch {
    // ídem: se verá otra vez y no pasa nada
  }
}
