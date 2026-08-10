import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env y rellena las claves.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // En web supabase-js usa localStorage por defecto; AsyncStorage solo en nativo.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

let channelSeq = 0;

/**
 * Canal de Realtime exclusivo de quien lo pide.
 *
 * `supabase.channel(topic)` NO crea un canal nuevo si ya existe otro con ese
 * topic: devuelve el que hay. Y añadirle callbacks de postgres_changes cuando
 * ya está unido lanza «cannot add postgres_changes callbacks ... after
 * subscribe()». Pasaba con dos instancias de la misma pantalla vivas en la
 * pila (chat → ficha de la mesa → chat) y al resuscribirse mientras el canal
 * anterior aún se estaba cerrando (el removeChannel es asíncrono).
 *
 * El sufijo hace único el topic; en postgres_changes es solo un nombre, la
 * suscripción va en los bindings. NO usar para broadcast ni presence: ahí el
 * topic es el punto de encuentro entre usuarios y debe coincidir (typing.ts).
 */
export function uniqueChannel(topic: string): RealtimeChannel {
  channelSeq += 1;
  return supabase.channel(`${topic}:${channelSeq}`);
}

const columnProbes = new Map<string, Promise<boolean>>();

/**
 * ¿Existe ya esta columna? Una vez por sesión y cacheado.
 *
 * Los filtros de Realtime dependen de que la migración esté aplicada, y un
 * filtro sobre una columna que no existe deja el canal en error: la pantalla
 * se queda sin tiempo real y en silencio. Preguntando primero, el mismo
 * código funciona antes y después de aplicarla.
 */
export function hasColumn(table: string, column: string): Promise<boolean> {
  const key = `${table}.${column}`;
  const cached = columnProbes.get(key);
  if (cached) return cached;
  const probe = Promise.resolve(supabase.from(table).select(column).limit(1)).then(
    ({ error }) => !error
  );
  columnProbes.set(key, probe);
  return probe;
}

/** Suscripción viva que se puede cerrar aunque aún no se haya abierto. */
export type Subscription = { close: () => void };

/**
 * Abre un canal cuando se sabe si el filtro por `column` es aplicable.
 * `open` recibe true si puede filtrar y false si toca escuchar sin filtro
 * (comportamiento viejo). Cerrar antes de que resuelva la sonda no deja el
 * canal huérfano.
 */
export function subscribeScoped(
  table: string,
  column: string,
  open: (filtered: boolean) => RealtimeChannel
): Subscription {
  let channel: RealtimeChannel | null = null;
  let closed = false;
  hasColumn(table, column).then((filtered) => {
    if (closed) return;
    channel = open(filtered);
  });
  return {
    close() {
      closed = true;
      if (channel) supabase.removeChannel(channel);
      channel = null;
    },
  };
}
