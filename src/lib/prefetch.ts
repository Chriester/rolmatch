// Precalienta la caché de pantalla (screen-cache) de una mesa para que el
// hub abra al instante y cambiar de pestaña no enseñe ruedas de carga.
// Cada pieza se salta si ya está cacheada, y los errores se tragan: esto es
// una optimización oportunista, la carga de verdad la hace cada pantalla.

import { fetchGroup } from './groups';
import { fetchJournalEntries } from './journal';
import { fetchMessages } from './messages';
import { fetchPolls } from './polls';
import { cacheGet, cacheSet } from './screen-cache';

/** La ficha de la mesa: lo mínimo para que el hub no abra con página en blanco. */
export function warmGroup(id: string) {
  if (cacheGet(`group:${id}`)) return;
  fetchGroup(id)
    .then((g) => cacheSet(`group:${id}`, g))
    .catch(() => {});
}

/** Ficha + historial de chat: para las listas cuyo destino es el chat de mesa. */
export function warmGroupChat(id: string) {
  warmGroup(id);
  if (cacheGet(`group-msgs:${id}`)) return;
  fetchMessages(id)
    .then((list) => cacheSet(`group-msgs:${id}`, list))
    .catch(() => {});
}

/**
 * Las pestañas del hub (chat, agenda, diario). Solo tiene sentido con plaza
 * en la mesa: la RLS devolvería vacío a un visitante.
 */
export function warmGroupTabs(id: string, userId: string) {
  if (!cacheGet(`group-msgs:${id}`))
    fetchMessages(id)
      .then((list) => cacheSet(`group-msgs:${id}`, list))
      .catch(() => {});
  if (!cacheGet(`group-polls:${id}`))
    fetchPolls(id, userId)
      .then((list) => cacheSet(`group-polls:${id}`, list))
      .catch(() => {});
  if (!cacheGet(`group-journal:${id}`))
    fetchJournalEntries(id)
      .then((list) => cacheSet(`group-journal:${id}`, list))
      .catch(() => {});
}
