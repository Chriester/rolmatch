// Marca local de "hasta cuándo ya viste tus encuentros": por dispositivo a
// propósito, igual que el tutorial (rolder-tutorial-visto) — no hace falta
// una columna en la DB para esto, y ver el badge otra vez en un móvil nuevo
// no hace daño.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rolder-likes-vistos-hasta';

export async function getLastSeenLikesAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function markLikesSeenNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, new Date().toISOString());
  } catch {
    // sin storage (modo privado, etc.): no pasa nada, el badge se recalcula
  }
}
