// Factoría de los avisos in-app entre pantallas (sin payload): un Set de
// listeners y un emit que los recorre aislando errores — un listener que
// lance no corta a los demás. unread-events, likes-events y feed-events son
// (o serán) instancias de esto; no copiar el patrón a mano una cuarta vez.

type Listener = () => void;

export function createEmitter() {
  const listeners = new Set<Listener>();
  return {
    on(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit() {
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          console.warn('listener de emisor falló', error);
        }
      }
    },
  };
}
