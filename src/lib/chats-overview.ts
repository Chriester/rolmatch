// La lista unificada de «Mis chats» (mesas + privados, ordenada por
// actividad) como función de lib: la pantalla la pinta y prefetch.ts la
// precalienta, sin duplicar el merge.

import { fetchMyDmChats, type DmSummary } from './dm';
import { fetchMyChats, type ChatSummary } from './messages';

export type ChatRow = ({ kind: 'group' } & ChatSummary) | ({ kind: 'dm' } & DmSummary);

function sortByActivity(a: ChatRow, b: ChatRow) {
  if (a.lastMessage && b.lastMessage)
    return b.lastMessage.created_at.localeCompare(a.lastMessage.created_at);
  if (a.lastMessage) return -1;
  if (b.lastMessage) return 1;
  return a.name.localeCompare(b.name);
}

export async function fetchChatRows(userId: string): Promise<ChatRow[]> {
  const [groups, dms] = await Promise.all([
    fetchMyChats(userId),
    // degrada a [] por sí sola si la migración 00025 no está aplicada
    fetchMyDmChats(userId),
  ]);
  return [
    ...groups.map((g) => ({ kind: 'group' as const, ...g })),
    ...dms.map((d) => ({ kind: 'dm' as const, ...d })),
  ].sort(sortByActivity);
}
