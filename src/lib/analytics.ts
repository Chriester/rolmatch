// Analítica mínima (migración 00043). Escribe y se olvida: si falla, falla en
// silencio — un evento perdido nunca debe romper una pantalla.
//
// Solo se registra lo que no se puede deducir del esquema. Los matches, los
// mensajes y las sesiones jugadas ya tienen su created_at en su tabla; lo que
// no deja rastro es abrir la app, dónde se abandona el onboarding y cuándo el
// feed se queda vacío. Añadir eventos aquí es barato, pero pensarlo dos veces:
// lo que no se vaya a mirar es solo ruido y filas.

import { supabase } from '@/lib/supabase';

export type AnalyticsEvent =
  /** apertura de la app con sesión (base de las cohortes de retención) */
  | 'app_open'
  /** paso del onboarding alcanzado; props: { step } */
  | 'onboarding_step'
  /** perfil terminado (el numerador de «% de perfiles completos») */
  | 'onboarding_completed'
  /** el feed se quedó sin tarjetas que enseñar */
  | 'feed_empty'
  /** swipe en el feed; props: { direction, kind } */
  | 'swipe'
  /** enlace de invitación de mesa compartido; props: { via } — el motor de
   *  crecimiento nº1 y hasta ahora invisible */
  | 'share_group_link'
  /** la app en sí compartida desde Opciones; props: { via } */
  | 'share_app';

export function track(
  userId: string | null | undefined,
  name: AnalyticsEvent,
  props: Record<string, string | number | boolean> = {}
) {
  if (!userId) return;
  void supabase
    .from('analytics_events')
    .insert({ user_id: userId, name, props })
    .then(() => undefined, () => undefined);
}
