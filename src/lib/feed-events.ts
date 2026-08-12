// Aviso in-app de «recarga el feed»: tocar el dado de la barra inferior
// estando ya en el feed fuerza la recarga sin acoplar la barra a la pantalla.

import { createEmitter } from '@/lib/emitter';

const bus = createEmitter();

export const onFeedRefresh = bus.on;
export const emitFeedRefresh = bus.emit;
