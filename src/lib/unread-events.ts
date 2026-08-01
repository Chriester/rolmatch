// Aviso in-app de «los no-leídos han cambiado»: al marcar un chat como
// leído, el badge del tab de chats y el punto del header se refrescan al
// instante en vez de esperar al refresco de fondo (cada minuto).
// Sin dependencias: lo importan messages.ts y dm.ts sin riesgo de ciclos.

type Listener = () => void;

const listeners = new Set<Listener>();

export function onUnreadChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitUnreadChanged() {
  for (const listener of [...listeners]) listener();
}
