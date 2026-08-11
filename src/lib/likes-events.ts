// Aviso in-app de «los encuentros vistos han cambiado»: al abrir la pestaña
// Encuentros, el badge del tab se refresca al instante en vez de esperar al
// refresco de fondo. Mismo patrón que unread-events.ts (mensajes).

type Listener = () => void;

const listeners = new Set<Listener>();

export function onLikesSeenChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitLikesSeenChanged() {
  for (const listener of [...listeners]) listener();
}
