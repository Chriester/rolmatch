// Chat 1-a-1 (issue #42): hilos privados entre usuarios que comparten mesa.
// La mecánica de mensajes es la misma que la del chat de mesa y vive en
// chat-core.ts; aquí queda lo propio del 1-a-1: crear el hilo, saber con
// quién hablas y filtrar los bloqueos.

import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  DM_CHAT,
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
  type ReactionSummary,
} from '@/lib/chat-core';
import { rollSummary, type DiceRoll } from '@/lib/dice';
import type { ChatSummary } from '@/lib/messages';
import { fetchBlockRelations } from '@/lib/moderation';
import { supabase, type Subscription } from '@/lib/supabase';

export type DmMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  kind: MessageKind;
  media_url: string | null;
  created_at: string;
  edited_at: string | null;
};

export type DmThread = {
  id: string;
  otherId: string;
  otherAlias: string;
  otherAvatarUrl: string | null;
};

/** Resumen para «Mis chats» — misma forma que ChatSummary pero con hilo. */
export type DmSummary = Omit<ChatSummary, 'groupId'> & {
  threadId: string;
  otherId: string;
};

function normalizePair(a: string, b: string): { user_lo: string; user_hi: string } {
  return a < b ? { user_lo: a, user_hi: b } : { user_lo: b, user_hi: a };
}

/**
 * Devuelve el hilo con ese usuario, creándolo si no existe. La RLS solo
 * permite crear hilos entre gente que comparte mesa: si no es el caso,
 * lanza con un mensaje entendible.
 */
export async function getOrCreateDmThread(myId: string, otherId: string): Promise<string> {
  const pair = normalizePair(myId, otherId);
  const { data: existing, error: selectError } = await supabase
    .from('dm_threads')
    .select('id')
    .eq('user_lo', pair.user_lo)
    .eq('user_hi', pair.user_hi)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from('dm_threads')
    .insert(pair)
    .select('id')
    .single();
  if (insertError) {
    // 23505 = otro dispositivo lo creó a la vez; 42501 = la RLS lo prohíbe
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('dm_threads')
        .select('id')
        .eq('user_lo', pair.user_lo)
        .eq('user_hi', pair.user_hi)
        .single();
      if (raced) return raced.id;
    }
    if (insertError.code === '42501') {
      throw new Error(
        'Solo puedes escribir a gente con la que compartes mesa, o candidatos de tus mesas.'
      );
    }
    throw insertError;
  }
  return created.id;
}

/** Hilo + identidad del otro participante (para la cabecera del chat). */
export async function fetchDmThread(threadId: string, myId: string): Promise<DmThread | null> {
  const { data: thread, error } = await supabase
    .from('dm_threads')
    .select('id, user_lo, user_hi')
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw error;
  if (!thread) return null;
  const otherId = thread.user_lo === myId ? thread.user_hi : thread.user_lo;
  const { data: profile } = await supabase
    .from('profiles')
    .select('alias, avatar_url')
    .eq('id', otherId)
    .maybeSingle();
  return {
    id: thread.id,
    otherId,
    otherAlias: profile?.alias ?? 'Jugador/a',
    otherAvatarUrl: profile?.avatar_url ?? null,
  };
}

export const fetchDmMessages = (threadId: string, limit?: number, before?: string) =>
  fetchConversation<DmMessage>(DM_CHAT, threadId, limit, before);

export const sendDmMessage = (threadId: string, senderId: string, body: string) =>
  insertMessage<DmMessage>(DM_CHAT, threadId, senderId, { kind: 'text', body: body.trim() });

export const sendDmMediaMessage = (
  threadId: string,
  senderId: string,
  kind: 'gif' | 'sticker',
  content: { mediaUrl?: string; body?: string }
) =>
  insertMessage<DmMessage>(DM_CHAT, threadId, senderId, {
    kind,
    media_url: content.mediaUrl ?? null,
    body: content.body ?? null,
  });

/** Foto al 1-a-1 (migr. 00038). */
export const sendDmImageMessage = (threadId: string, senderId: string, mediaUrl: string) =>
  insertMessage<DmMessage>(DM_CHAT, threadId, senderId, { kind: 'image', media_url: mediaUrl });

/** Tirada de dados al 1-a-1: body legible + JSON en media_url (migr. 00031). */
export const sendDmRollMessage = (threadId: string, senderId: string, roll: DiceRoll) =>
  insertMessage<DmMessage>(DM_CHAT, threadId, senderId, {
    kind: 'roll',
    body: rollSummary(roll),
    media_url: JSON.stringify(roll),
  });

export const fetchDmReactions = (
  messageIds: string[],
  viewerId: string
): Promise<Map<string, ReactionSummary[]>> => fetchReactions(DM_CHAT, messageIds, viewerId);

export const toggleDmReaction = (
  messageId: string,
  userId: string,
  emoji: string,
  on: boolean
) => toggleReaction(DM_CHAT, messageId, userId, emoji, on);

export const subscribeToDmReactions = (
  threadId: string,
  handlers: { onAdd: (e: ReactionEvent) => void; onRemove: (e: ReactionEvent) => void }
): Subscription => subscribeToConversationReactions(DM_CHAT, threadId, handlers);

export const editDmMessage = (messageId: string, body: string) =>
  editMessageIn(DM_CHAT, messageId, body);

export const deleteDmMessage = (messageId: string) => deleteMessageIn(DM_CHAT, messageId);

export const subscribeToDmMessages = (
  threadId: string,
  handlers: {
    onInsert: (row: DmMessage) => void;
    onUpdate?: (row: DmMessage) => void;
    onDelete?: (id: string) => void;
  }
) => subscribeToConversation<DmMessage>(DM_CHAT, threadId, handlers);

export function unsubscribeFromDmMessages(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}

export const fetchDmLastRead = (threadId: string, userId: string) =>
  fetchLastReadAt(DM_CHAT, threadId, userId);

export const markDmRead = (threadId: string, userId: string) =>
  markRead(DM_CHAT, threadId, userId);

type DmSummaryRow = {
  thread_id: string;
  other_id: string;
  other_alias: string | null;
  other_avatar_url: string | null;
  last_body: string | null;
  last_kind: MessageKind;
  last_created_at: string | null;
  unread: number;
};

/** Mis hilos 1-a-1 con último mensaje y no-leídos exactos (migr. 00041). */
export async function fetchMyDmChats(userId: string): Promise<DmSummary[]> {
  try {
    const [{ data: allThreads, error }, blocked] = await Promise.all([
      supabase
        .from('dm_threads')
        .select('id, user_lo, user_hi')
        .or(`user_lo.eq.${userId},user_hi.eq.${userId}`),
      fetchBlockRelations(userId).catch(() => new Set<string>()),
    ]);
    if (error) throw error;
    // hilos con gente bloqueada (en cualquier dirección): fuera de la lista
    const visible = new Set(
      (allThreads ?? [])
        .filter((t) => !blocked.has(t.user_lo === userId ? t.user_hi : t.user_lo))
        .map((t) => t.id)
    );
    if (visible.size === 0) return [];

    const { data: rows, error: rpcError } = await supabase.rpc('dm_summaries');
    if (rpcError) throw rpcError;

    return (rows as DmSummaryRow[])
      .filter((row) => visible.has(row.thread_id))
      .map((row) => ({
        threadId: row.thread_id,
        otherId: row.other_id,
        name: row.other_alias ?? 'Jugador/a',
        imageUrl: row.other_avatar_url,
        lastMessage: row.last_created_at
          ? {
              body: messagePreview({ body: row.last_body, kind: row.last_kind }),
              sender: null, // en un 1-a-1 el nombre del emisor sobra
              created_at: row.last_created_at,
            }
          : null,
        unread: Math.min(row.unread ?? 0, 99),
      }));
  } catch {
    return [];
  }
}
