// Indicador «escribiendo…» vía Realtime broadcast (sin tablas: efímero).
// Cada chat abre un canal typing:<clave>; al teclear se emite un ping
// throttled y el receptor lo muestra unos segundos.

import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

const THROTTLE_MS = 1500;

export type TypingHandle = {
  channel: RealtimeChannel;
  /** Llamar en cada cambio del borrador; emite como mucho una vez por throttle. */
  sendTyping: (alias: string) => void;
};

export function joinTypingChannel(
  key: string,
  myId: string,
  onTyping: (alias: string) => void
): TypingHandle {
  const channel = supabase.channel(`typing:${key}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on('broadcast', { event: 'typing' }, (message) => {
      const payload = message.payload as { userId?: string; alias?: string };
      if (payload.userId && payload.userId !== myId) onTyping(payload.alias ?? 'Alguien');
    })
    .subscribe();

  let lastSent = 0;
  const sendTyping = (alias: string) => {
    const now = Date.now();
    if (now - lastSent < THROTTLE_MS) return;
    lastSent = now;
    channel.send({ type: 'broadcast', event: 'typing', payload: { userId: myId, alias } });
  };

  return { channel, sendTyping };
}

export function leaveTypingChannel(handle: TypingHandle) {
  supabase.removeChannel(handle.channel);
}
