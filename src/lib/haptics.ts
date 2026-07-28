// Háptica con red de seguridad: import dinámico + try/catch para que los
// binarios viejos sin el módulo nativo (o la web) sigan funcionando igual.

import { Platform } from 'react-native';

async function haptics() {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-haptics');
  } catch {
    return null;
  }
}

/** Tick ligero al armar el sello de ¡CRÍTICO!/PIFIA (cruce del umbral). */
export async function hapticArm() {
  const H = await haptics();
  try {
    await H?.impactAsync(H.ImpactFeedbackStyle.Light);
  } catch {}
}

/** Golpe medio al confirmar el swipe (la tarjeta sale volando). */
export async function hapticSwipe() {
  const H = await haptics();
  try {
    await H?.impactAsync(H.ImpactFeedbackStyle.Medium);
  } catch {}
}

/** Celebración al hacer match. */
export async function hapticMatch() {
  const H = await haptics();
  try {
    await H?.notificationAsync(H.NotificationFeedbackType.Success);
  } catch {}
}
