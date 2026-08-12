// Aviso in-app de «los no-leídos han cambiado»: al marcar un chat como
// leído, el badge del tab y el punto del header se refrescan al instante
// en vez de esperar al refresco de fondo.

import { createEmitter } from '@/lib/emitter';

const bus = createEmitter();

export const onUnreadChanged = bus.on;
export const emitUnreadChanged = bus.emit;
