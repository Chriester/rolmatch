// Reporte de crashes a client_errors (migr. 00037): best-effort absoluto —
// si el propio reporte falla (sin red, sin migración), silencio; jamás debe
// empeorar el error original.

import { Platform } from 'react-native';

export async function reportClientError(error: Error, componentStack?: string | null) {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.auth.getSession();
    const route =
      Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : null;
    await supabase.from('client_errors').insert({
      user_id: data.session?.user.id ?? null,
      message: error.message.slice(0, 500),
      stack: [error.stack, componentStack].filter(Boolean).join('\n---\n').slice(0, 4000),
      route,
      platform: Platform.OS,
      build: process.env.EXPO_PUBLIC_BUILD_SHA?.slice(0, 12) ?? 'dev',
    });
  } catch {
    // el logging nunca rompe nada
  }
}
