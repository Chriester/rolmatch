// Precalienta la caché de pantalla (screen-cache) de una mesa para que el
// hub abra al instante y cambiar de pestaña no enseñe ruedas de carga.
// Cada pieza se salta si ya está cacheada, y los errores se tragan: esto es
// una optimización oportunista, la carga de verdad la hace cada pantalla.

import { fetchMyCharacters } from './characters';
import { fetchChatRows } from './chats-overview';
import { fetchGroupCandidates } from './feed';
import { fetchGroup } from './groups';
import { fetchJournalEntries } from './journal';
import { fetchMessages } from './messages';
import { fetchMyTablesOverview } from './my-tables';
import { fetchPolls } from './polls';
import { fetchPremiumStatus, fetchReceivedLikes } from './premium';
import { cacheGet, cacheSet } from './screen-cache';

/** fetch → caché, salvo que ya haya algo. El error se traga a propósito. */
function warm(key: string, fetcher: () => Promise<unknown>) {
  if (cacheGet(key)) return;
  fetcher()
    .then((value) => cacheSet(key, value))
    .catch(() => {});
}

/** La ficha de la mesa: lo mínimo para que el hub no abra con página en blanco. */
export function warmGroup(id: string) {
  warm(`group:${id}`, () => fetchGroup(id));
}

/**
 * Los tabs de la home (Mesas, Encuentros, Chats, personajes del perfil):
 * se calientan nada más entrar para que el primer toque en cada tab pinte
 * al instante. Cada pantalla refresca por su cuenta al ganar el foco.
 */
export function warmHomeTabs(userId: string) {
  warm(`my-tables:${userId}`, () => fetchMyTablesOverview(userId));
  warm(`likes:${userId}`, async () => {
    const [likes, status] = await Promise.all([
      fetchReceivedLikes(userId),
      fetchPremiumStatus(userId),
    ]);
    return { likes, premium: status.active };
  });
  warm(`chats:${userId}`, () => fetchChatRows(userId));
  warm(`characters:${userId}`, () => fetchMyCharacters(userId));
}

/** La cola de candidatos de una mesa (solo su GM la puede leer). */
export function warmCandidates(groupId: string, viewerId: string) {
  warm(`candidates:${groupId}`, () =>
    fetchGroupCandidates(groupId, viewerId, { onlyApplicants: true })
  );
}

/** Ficha + historial de chat: para las listas cuyo destino es el chat de mesa. */
export function warmGroupChat(id: string) {
  warmGroup(id);
  warm(`group-msgs:${id}`, () => fetchMessages(id));
}

/**
 * Las pestañas del hub (chat, agenda, diario). Solo tiene sentido con plaza
 * en la mesa: la RLS devolvería vacío a un visitante.
 */
export function warmGroupTabs(id: string, userId: string) {
  warm(`group-msgs:${id}`, () => fetchMessages(id));
  warm(`group-polls:${id}`, () => fetchPolls(id, userId));
  warm(`group-journal:${id}`, () => fetchJournalEntries(id));
}
