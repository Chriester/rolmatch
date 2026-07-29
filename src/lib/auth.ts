import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = Linking.createURL('auth/callback');

/**
 * Login OAuth vía Supabase (PKCE). En web redirige el navegador; en nativo
 * abre una sesión de navegador y canjea el código devuelto por el deep link.
 */
async function signInWithProvider(provider: 'discord' | 'google', scopes?: string) {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes,
      },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true, scopes },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // cancelado por el usuario

  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) throw new Error('El proveedor no devolvió un código de autorización.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

export async function signInWithDiscord() {
  // guilds.join permite al bot unir al usuario al servidor comunitario
  // automáticamente tras el login (Edge Function discord-join)
  return signInWithProvider('discord', 'identify email guilds.join');
}

export async function signInWithGoogle() {
  return signInWithProvider('google');
}

/** Fallback por email (magic link) — §5 Fase 1. */
export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Une al usuario al servidor comunitario de Discord vía la Edge Function
 * discord-join. El provider_token solo existe justo después del login OAuth,
 * por eso se llama al detectar sesión nueva. Nunca es fatal.
 */
export async function ensureCommunityMembership(providerToken: string) {
  try {
    await supabase.functions.invoke('discord-join', {
      body: { provider_token: providerToken },
    });
  } catch {
    // sin red o función no desplegada: la app sigue funcionando
  }
}
