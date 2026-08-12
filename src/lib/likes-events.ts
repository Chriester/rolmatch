// Aviso in-app de «los encuentros vistos han cambiado»: al abrir la pestaña
// Encuentros, el badge del tab se refresca al instante en vez de esperar al
// refresco de fondo.

import { createEmitter } from '@/lib/emitter';

const bus = createEmitter();

export const onLikesSeenChanged = bus.on;
export const emitLikesSeenChanged = bus.emit;
