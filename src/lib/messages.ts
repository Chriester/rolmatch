// Chat de mesa. La mecánica (consultas, reacciones, lecturas, tiempo real)
// vive en chat-core.ts, compartida con el 1-a-1; aquí quedan los tipos de la
// mesa y la lista de «Mis chats», que sí es propia.

import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  GROUP_CHAT,
  deleteMessageIn,
  editMessageIn,
  fetchConversation,
  fetchLastReadAt,
  fetchReactions,
  insertMessage,
  markRead,
  messagePreview,
  subscribeToConversation,
  subscribeToConversationReactions,
  toggleReaction,
  type MessageKind,
  type ReactionEvent,
} from '@/lib/chat-core';
import { rollSummary, type DiceRoll } from '@/lib/dice';
import { supabase, type Subscription } from '@/lib/supabase';

export {
  REACTION_EMOJIS,
  messagePreview,
  type MessageKind,
  type ReactionEvent,
  type ReactionSummary,
} from '@/lib/chat-core';

export type ChatMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string | null;
  kind: MessageKind;
  media_url: string | null;
  created_at: string;
  edited_at: string | null;
  profiles: { alias: string; avatar_url: string | null } | null;
};

export type ChatSummary = {
  groupId: string;
  name: string;
  imageUrl: string | null;
  lastMessage: { body: string; sender: string | null; created_at: string } | null;
  /** mensajes ajenos posteriores a mi última lectura (tope 99) */
  unread: number;
};

type GroupRef = { id: string; name: string; image_url: string | null };

type ChatSummaryRow = {
  group_id: string;
  last_body: string | null;
  last_kind: MessageKind;
  last_sender: string | null;
  last_created_at: string | null;
  unread: number;
};

/** Con mensajes primero (el más reciente arriba); vacíos al final por nombre. */
function byLastActivity(a: ChatSummary, b: ChatSummary) {
  if (a.lastMessage && b.lastMessage)
    return b.lastMessage.created_at.localeCompare(a.lastMessage.created_at);
  if (a.lastMessage) return -1;
  if (b.lastMessage) return 1;
  return a.name.localeCompare(b.name);
}

/** Mesas donde soy miembro, con el último mensaje de cada una (para «Mis chats»). */
export async function fetchMyChats(userId: string): Promise<ChatSummary[]> {
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, image_url)')
    .eq('user_id', userId);
  if (error) throw error;

  const groups = (memberships ?? [])
    .map((m) => m.groups as unknown as GroupRef | null)
    .filter((g): g is GroupRef => g !== null);
  if (groups.length === 0) return [];

  // Último mensaje y no leídos EXACTOS por mesa, en una consulta (migr. 00041)
  const { data: rows, error: rpcError } = await supabase.rpc('chat_summaries');
  if (rpcError) throw rpcError;
  const byGroup = new Map((rows as ChatSummaryRow[]).map((row) => [row.group_id, row]));

  return groups
    .map((g) => {
      const row = byGroup.get(g.id);
      return {
        groupId: g.id,
        name: g.name,
        imageUrl: g.image_url,
        lastMessage: row?.last_created_at
          ? {
              body: messagePreview({ body: row.last_body, kind: row.last_kind }),
              sender: row.last_sender,
              created_at: row.last_created_at,
            }
          : null,
        unread: Math.min(row?.unread ?? 0, 99),
      };
    })
    .sort(byLastActivity);
}

/** Total de no-leídos entre mesas e hilos 1-a-1 (punto del avatar y tab). */
export async function fetchUnreadTotal(userId: string): Promise<number> {
  try {
    // import perezoso: dm.ts importa de este módulo y el estático haría ciclo
    const { fetchMyDmChats } = await import('@/lib/dm');
    const [chats, dms] = await Promise.all([fetchMyChats(userId), fetchMyDmChats(userId)]);
    return [...chats, ...dms].reduce((total, chat) => total + chat.unread, 0);
  } catch {
    return 0;
  }
}

export const fetchLastRead = (groupId: string, userId: string) =>
  fetchLastReadAt(GROUP_CHAT, groupId, userId);

export const markChatRead = (groupId: string, userId: string) =>
  markRead(GROUP_CHAT, groupId, userId);

export const fetchMessages = (groupId: string, limit?: number, before?: string) =>
  fetchConversation<ChatMessage>(GROUP_CHAT, groupId, limit, before);

export const sendMessage = (groupId: string, senderId: string, body: string) =>
  insertMessage<ChatMessage>(GROUP_CHAT, groupId, senderId, {
    kind: 'text',
    body: body.trim(),
  });

/** Envía un GIF (URL de KLIPY) o un sticker (emoji en body, o media_url) */
export const sendMediaMessage = (
  groupId: string,
  senderId: string,
  kind: 'gif' | 'sticker',
  content: { mediaUrl?: string; body?: string }
) =>
  insertMessage<ChatMessage>(GROUP_CHAT, groupId, senderId, {
    kind,
    media_url: content.mediaUrl ?? null,
    body: content.body ?? null,
  });

/** Foto al chat (migr. 00038): la URL ya subida a Storage. */
export const sendImageMessage = (groupId: string, senderId: string, mediaUrl: string) =>
  insertMessage<ChatMessage>(GROUP_CHAT, groupId, senderId, {
    kind: 'image',
    media_url: mediaUrl,
  });

/** Tirada de dados al chat: body legible + JSON en media_url (migr. 00031). */
export const sendRollMessage = (groupId: string, senderId: string, roll: DiceRoll) =>
  insertMessage<ChatMessage>(GROUP_CHAT, groupId, senderId, {
    kind: 'roll',
    body: rollSummary(roll),
    media_url: JSON.stringify(roll),
  });

export const fetchMessageReactions = (messageIds: string[], viewerId: string) =>
  fetchReactions(GROUP_CHAT, messageIds, viewerId);

export const toggleMessageReaction = (
  messageId: string,
  userId: string,
  emoji: string,
  on: boolean
) => toggleReaction(GROUP_CHAT, messageId, userId, emoji, on);

export const subscribeToReactions = (
  groupId: string,
  handlers: { onAdd: (e: ReactionEvent) => void; onRemove: (e: ReactionEvent) => void }
): Subscription => subscribeToConversationReactions(GROUP_CHAT, groupId, handlers);

export const editMessage = (messageId: string, body: string) =>
  editMessageIn(GROUP_CHAT, messageId, body);

export const deleteMessage = (messageId: string) => deleteMessageIn(GROUP_CHAT, messageId);

export const subscribeToMessages = (
  groupId: string,
  handlers: {
    onInsert: (row: Omit<ChatMessage, 'profiles'>) => void;
    onUpdate?: (row: Omit<ChatMessage, 'profiles'>) => void;
    onDelete?: (id: string) => void;
  }
) => subscribeToConversation<Omit<ChatMessage, 'profiles'>>(GROUP_CHAT, groupId, handlers);

export function unsubscribeFromMessages(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
