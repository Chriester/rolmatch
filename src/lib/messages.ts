import type { RealtimeChannel } from '@supabase/supabase-js';

import { rollSummary, type DiceRoll } from '@/lib/dice';
import { supabase, uniqueChannel } from '@/lib/supabase';
import { emitUnreadChanged } from '@/lib/unread-events';

export type MessageKind = 'text' | 'gif' | 'sticker' | 'roll' | 'image';

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

// Hint del FK obligatorio: message_reactions es tabla puente messages↔profiles
// y sin él el embed es ambiguo (PGRST201) desde la migración 00036
const MESSAGE_SELECT =
  'id, group_id, sender_id, body, kind, media_url, created_at, edited_at, profiles!messages_sender_id_fkey(alias, avatar_url)';

/** Preview de un mensaje para listas (los media no tienen body legible) */
export function messagePreview(message: { body: string | null; kind: MessageKind }): string {
  if (message.kind === 'gif') return '🎞️ GIF';
  if (message.kind === 'sticker') return `${message.body ?? '🎟️'} sticker`;
  if (message.kind === 'roll') return message.body ?? '🎲 tirada';
  if (message.kind === 'image') return '📷 Foto';
  return message.body ?? '';
}

export type ChatSummary = {
  groupId: string;
  name: string;
  imageUrl: string | null;
  lastMessage: { body: string; sender: string | null; created_at: string } | null;
  /** mensajes ajenos posteriores a mi última lectura (tope 99) */
  unread: number;
};

/** Mesas donde soy miembro, con el último mensaje de cada una (para «Mis chats»). */
export async function fetchMyChats(userId: string): Promise<ChatSummary[]> {
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, image_url)')
    .eq('user_id', userId);
  if (error) throw error;

  const groups = (memberships ?? [])
    .map((m) => m.groups as unknown as { id: string; name: string; image_url: string | null } | null)
    .filter((g): g is { id: string; name: string; image_url: string | null } => g !== null);
  if (groups.length === 0) return [];

  // Últimos mensajes de todas mis mesas de una tacada; el primero por mesa
  // es su último mensaje (con 200 sobra para una lista de chats de alpha).
  const [{ data: recent, error: msgError }, { data: reads, error: readsError }] =
    await Promise.all([
      supabase
        .from('messages')
        .select('group_id, sender_id, body, kind, created_at, profiles!messages_sender_id_fkey(alias)')
        .in(
          'group_id',
          groups.map((g) => g.id)
        )
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('chat_reads').select('group_id, last_read_at').eq('user_id', userId),
    ]);
  if (msgError) throw msgError;

  // Sin la migración 00019 aplicada, reads falla: todo cuenta como leído
  const readByGroup = new Map(
    readsError ? [] : (reads ?? []).map((r) => [r.group_id, r.last_read_at])
  );

  const lastByGroup = new Map<string, ChatSummary['lastMessage']>();
  const unreadByGroup = new Map<string, number>();
  for (const row of recent ?? []) {
    if (!lastByGroup.has(row.group_id)) {
      const sender = row.profiles as unknown as { alias: string } | null;
      lastByGroup.set(row.group_id, {
        body: messagePreview(row as { body: string | null; kind: MessageKind }),
        sender: sender?.alias ?? null,
        created_at: row.created_at,
      });
    }
    const lastRead = readByGroup.get(row.group_id);
    if (row.sender_id !== userId && (!lastRead || row.created_at > lastRead)) {
      unreadByGroup.set(row.group_id, (unreadByGroup.get(row.group_id) ?? 0) + 1);
    }
  }

  return groups
    .map((g) => ({
      groupId: g.id,
      name: g.name,
      imageUrl: g.image_url,
      lastMessage: lastByGroup.get(g.id) ?? null,
      unread: readsError ? 0 : Math.min(unreadByGroup.get(g.id) ?? 0, 99),
    }))
    .sort((a, b) => {
      // con mensajes primero (más reciente arriba); vacíos al final por nombre
      if (a.lastMessage && b.lastMessage)
        return b.lastMessage.created_at.localeCompare(a.lastMessage.created_at);
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return a.name.localeCompare(b.name);
    });
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

/** Mi última lectura de este chat (para el separador «nuevos»). */
export async function fetchLastRead(groupId: string, userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('chat_reads')
      .select('last_read_at')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.last_read_at ?? null;
  } catch {
    return null;
  }
}

/** Marca el chat como leído hasta ahora (best effort: sin migración, no-op). */
export async function markChatRead(groupId: string, userId: string) {
  try {
    await supabase
      .from('chat_reads')
      .upsert({ group_id: groupId, user_id: userId, last_read_at: new Date().toISOString() });
    emitUnreadChanged(); // el badge del tab se refresca al momento
  } catch {
    // tabla aún no migrada o sin red: el badge simplemente no se actualiza
  }
}

// Ultimos `limit` mensajes de la mesa, mas reciente primero (para FlatList
// invertido). `before` pagina hacia atras: mensajes anteriores a ese instante.
export async function fetchMessages(
  groupId: string,
  limit = 100,
  before?: string
): Promise<ChatMessage[]> {
  let query = supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ChatMessage[];
}

export async function sendMessage(
  groupId: string,
  senderId: string,
  body: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, sender_id: senderId, body: body.trim(), kind: 'text' })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as ChatMessage;
}

/** Envía un GIF (URL de Tenor) o un sticker (emoji en body, o media_url) */
export async function sendMediaMessage(
  groupId: string,
  senderId: string,
  kind: 'gif' | 'sticker',
  content: { mediaUrl?: string; body?: string }
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      group_id: groupId,
      sender_id: senderId,
      kind,
      media_url: content.mediaUrl ?? null,
      body: content.body ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as ChatMessage;
}

/** Foto al chat (migr. 00038): la URL pública ya subida a Storage. */
export async function sendImageMessage(
  groupId: string,
  senderId: string,
  mediaUrl: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, sender_id: senderId, kind: 'image', media_url: mediaUrl })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as ChatMessage;
}

/** Tirada de dados al chat: body legible + JSON en media_url (migr. 00031). */
export async function sendRollMessage(
  groupId: string,
  senderId: string,
  roll: DiceRoll
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      group_id: groupId,
      sender_id: senderId,
      kind: 'roll',
      body: rollSummary(roll),
      media_url: JSON.stringify(roll),
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as ChatMessage;
}

// ---- Reacciones (migr. 00036) ----

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🎲', '🔥'];

export type ReactionSummary = { emoji: string; count: number; mine: boolean };

export type ReactionEvent = { message_id: string; user_id: string; emoji: string };

/** Reacciones agregadas por mensaje. Degrada a vacío sin la migración. */
export async function fetchMessageReactions(
  messageIds: string[],
  viewerId: string
): Promise<Map<string, ReactionSummary[]>> {
  const map = new Map<string, ReactionSummary[]>();
  if (messageIds.length === 0) return map;
  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);
    if (error) throw error;
    for (const row of (data ?? []) as ReactionEvent[]) {
      const list = map.get(row.message_id) ?? [];
      const existing = list.find((r) => r.emoji === row.emoji);
      if (existing) {
        existing.count += 1;
        existing.mine = existing.mine || row.user_id === viewerId;
      } else {
        list.push({ emoji: row.emoji, count: 1, mine: row.user_id === viewerId });
      }
      map.set(row.message_id, list);
    }
  } catch {
    // migración 00036 sin aplicar
  }
  return map;
}

export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  emoji: string,
  on: boolean
) {
  if (on) {
    const { error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) throw error;
  }
}

/**
 * Reacciones en vivo. Sin filtro (message_id no es filtrable por mesa): el
 * caller descarta los eventos de mensajes que no tenga cargados.
 */
export function subscribeToReactions(
  key: string,
  handlers: { onAdd: (e: ReactionEvent) => void; onRemove: (e: ReactionEvent) => void }
): RealtimeChannel {
  return uniqueChannel(`reactions:${key}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'message_reactions' },
      (payload) => handlers.onAdd(payload.new as ReactionEvent)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'message_reactions' },
      (payload) => {
        const old = payload.old as Partial<ReactionEvent>;
        if (old.message_id && old.user_id && old.emoji) {
          handlers.onRemove(old as ReactionEvent);
        }
      }
    )
    .subscribe();
}

/** Edita un mensaje propio (la RLS rechaza los ajenos). */
export async function editMessage(messageId: string, body: string) {
  const { error } = await supabase
    .from('messages')
    .update({ body: body.trim(), edited_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

/** Borra un mensaje propio (la RLS rechaza los ajenos). */
export async function deleteMessage(messageId: string) {
  const { error } = await supabase.from('messages').delete().eq('id', messageId);
  if (error) throw error;
}

// El payload INSERT de Realtime trae la fila cruda, sin el embed de
// profiles: el caller resuelve alias/avatar contra group.group_members.
// UPDATE/DELETE requieren replica identity full (migr. 00027) para filtrar.
export function subscribeToMessages(
  groupId: string,
  handlers: {
    onInsert: (row: Omit<ChatMessage, 'profiles'>) => void;
    onUpdate?: (row: Omit<ChatMessage, 'profiles'>) => void;
    onDelete?: (id: string) => void;
  }
): RealtimeChannel {
  const filter = { schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` };
  return uniqueChannel(`messages:group:${groupId}`)
    .on('postgres_changes', { ...filter, event: 'INSERT' }, (payload) =>
      handlers.onInsert(payload.new as Omit<ChatMessage, 'profiles'>)
    )
    .on('postgres_changes', { ...filter, event: 'UPDATE' }, (payload) =>
      handlers.onUpdate?.(payload.new as Omit<ChatMessage, 'profiles'>)
    )
    .on('postgres_changes', { ...filter, event: 'DELETE' }, (payload) => {
      const old = payload.old as { id?: string };
      if (old.id) handlers.onDelete?.(old.id);
    })
    .subscribe();
}

export function unsubscribeFromMessages(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
