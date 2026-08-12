// Aviso in-app de «recarga el feed»: tocar el dado de la barra inferior
// estando ya en el feed fuerza la recarga sin acoplar la barra a la pantalla.
// Mismo patrón que unread-events.ts (mensajes) y likes-events.ts (encuentros).

type Listener = () => void;

const listeners = new Set<Listener>();

export function onFeedRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitFeedRefresh() {
  for (const listener of [...listeners]) listener();
}
