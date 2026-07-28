// Háptica del swipe. En Android usamos Vibration directamente: expo-haptics
// mapea a efectos "finos" que muchos dispositivos ignoran o apagan con los
// ajustes de sistema, y la vibración explícita sí se siente. En iOS,
// expo-haptics con import dinámico + try/catch (binarios viejos y web
// siguen funcionando sin el módulo).

import { Platform, Vibration } from 'react-native';

async function ios() {
  if (Platform.OS !== 'ios') return null;
  try {
    return await import('expo-haptics');
  } catch {
    return null;
  }
}

/** Tick ligero al armar el sello de ¡CRÍTICO!/PIFIA (cruce del umbral). */
export async function hapticArm() {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate(25);
    } catch {}
    return;
  }
  const H = await ios();
  try {
    await H?.impactAsync(H.ImpactFeedbackStyle.Light);
  } catch {}
}

/** Golpe medio al confirmar el swipe (la tarjeta sale volando). */
export async function hapticSwipe() {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate(45);
    } catch {}
    return;
  }
  const H = await ios();
  try {
    await H?.impactAsync(H.ImpactFeedbackStyle.Medium);
  } catch {}
}

/** Celebración al hacer match. */
export async function hapticMatch() {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    try {
      Vibration.vibrate([0, 60, 80, 120]);
    } catch {}
    return;
  }
  const H = await ios();
  try {
    await H?.notificationAsync(H.NotificationFeedbackType.Success);
  } catch {}
}
