// Núcleo compartido del chat de mesa y del 1-a-1.
//
// Los dos son la misma conversación con distinto ámbito: una fila por mensaje
// acotada por group_id o por thread_id, sus reacciones y su marca de lectura.
// Antes messages.ts y dm.ts eran trece pares de funciones idénticas salvo el
// nombre de la tabla, así que cada arreglo de mensajería costaba el doble y se
// olvidaba la mitad (el bug de los no leídos vivía por duplicado).
//
// Aquí vive el cómo; messages.ts y dm.ts se quedan con el qué y con los tipos
// de cada uno, para que las pantallas no se enteren.

import {
  subscribeScoped,
  supabase,
  uniqueChannel,
  type Subscription,
} from '@/lib/supabase';
import { emitUnreadChanged } from '@/lib/unread-events';

export type MessageKind = 'text' | 'gif' | 'sticker' | 'roll' | 'image';

/** Qué tablas y columnas usa cada tipo de conversación. */
export type ChatScope = {
  /** tabla de mensajes y columna que acota la conversación */
  table: 'messages' | 'dm_messages';
  column: 'group_id' | 'thread_id';
  /** columnas del mensaje (el chat de mesa embebe al emisor; el 1-a-1 no) */
  select: string;
  reactions: { table: 'message_reactions' | 'dm_message_reactions'; column: 'group_id' | 'thread_id' };
  reads: { table: 'chat_reads' | 'dm_reads' };
};

// Hint del FK obligatorio: message_reactions es tabla puente messages↔profiles
// y sin él el embed es ambiguo (PGRST201) desde la migración 00036
export const GROUP_CHAT: ChatScope = {
  table: 'messages',
  column: 'group_id',
  select:
    'id, group_id, sender_id, body, kind, media_url, created_at, edited_at, profiles!messages_sender_id_fkey(alias, avatar_url)',
  reactions: { table: 'message_reactions', column: 'group_id' },
  reads: { table: 'chat_reads' },
};

export const DM_CHAT: ChatScope = {
  table: 'dm_messages',
  column: 'thread_id',
  select: 'id, thread_id, sender_id, body, kind, media_url, created_at, edited_at',
  reactions: { table: 'dm_message_reactions', column: 'thread_id' },
  reads: { table: 'dm_reads' },
};

/** Preview de un mensaje para listas (los media no tienen body legible) */
export function messagePreview(message: { body: string | null; kind: MessageKind }): string {
  if (message.kind === 'gif') return 'GIF';
  if (message.kind === 'sticker') return `${message.body ?? '🎟️'} sticker`;
  if (message.kind === 'roll') return message.body ?? '🎲 tirada';
  if (message.kind === 'image') return 'Foto';
  return message.body ?? '';
}

/**
 * Últimos `limit` mensajes, más reciente primero (para FlatList invertido).
 * `before` pagina hacia atrás: mensajes anteriores a ese instante.
 */
export async function fetchConversation<T>(
  scope: ChatScope,
  id: string,
  limit = 100,
  before?: string
): Promise<T[]> {
  let query = supabase
    .from(scope.table)
    .select(scope.select)
    .eq(scope.column, id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

export type NewMessage = {
  kind: MessageKind;
  body?: string | null;
  media_url?: string | null;
};

export async function insertMessage<T>(
  scope: ChatScope,
  id: string,
  senderId: string,
  message: NewMessage
): Promise<T> {
  const { data, error } = await supabase
    .from(scope.table)
    .insert({
      [scope.column]: id,
      sender_id: senderId,
      kind: message.kind,
      body: message.body ?? null,
      media_url: message.media_url ?? null,
    })
    .select(scope.select)
    .single();
  if (error) throw error;
  return data as unknown as T;
}

/** Edita un mensaje propio (la RLS rechaza los ajenos). */
export async function editMessageIn(scope: ChatScope, messageId: string, body: string) {
  const { error } = await supabase
    .from(scope.table)
    .update({ body: body.trim(), edited_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

/** Borra un mensaje propio (la RLS rechaza los ajenos). */
export async function deleteMessageIn(scope: ChatScope, messageId: string) {
  const { error } = await supabase.from(scope.table).delete().eq('id', messageId);
  if (error) throw error;
}

// ---- Reacciones (migr. 00036) ----

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🎲', '🔥'];

export type ReactionSummary = { emoji: string; count: number; mine: boolean };
export type ReactionEvent = { message_id: string; user_id: string; emoji: string };

/** Agrupa las reacciones de un lote de mensajes por emoji. */
export function groupReactions(
  rows: ReactionEvent[],
  viewerId: string
): Map<string, ReactionSummary[]> {
  const map = new Map<string, ReactionSummary[]>();
  for (const row of rows) {
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
  return map;
}

export async function fetchReactions(
  scope: ChatScope,
  messageIds: string[],
  viewerId: string
): Promise<Map<string, ReactionSummary[]>> {
  if (messageIds.length === 0) return new Map();
  try {
    const { data, error } = await supabase
      .from(scope.reactions.table)
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);
    if (error) throw error;
    return groupReactions((data ?? []) as ReactionEvent[], viewerId);
  } catch {
    // migración 00036 sin aplicar
    return new Map();
  }
}

export async function toggleReaction(
  scope: ChatScope,
  messageId: string,
  userId: string,
  emoji: string,
  on: boolean
) {
  if (on) {
    const { error } = await supabase
      .from(scope.reactions.table)
      .insert({ message_id: messageId, user_id: userId, emoji });
    // Ya reaccionó con ese emoji: lo tratamos como éxito
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from(scope.reactions.table)
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) throw error;
  }
}

// ---- Lecturas ----

/** Mi última lectura de esta conversación (para el separador «nuevos»). */
export async function fetchLastReadAt(
  scope: ChatScope,
  id: string,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from(scope.reads.table)
      .select('last_read_at')
      .eq(scope.column, id)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.last_read_at ?? null;
  } catch {
    return null;
  }
}

/** Marca como leído hasta ahora (best effort: sin migración, no-op). */
export async function markRead(scope: ChatScope, id: string, userId: string) {
  try {
    await supabase
      .from(scope.reads.table)
      .upsert({ [scope.column]: id, user_id: userId, last_read_at: new Date().toISOString() });
    emitUnreadChanged(); // el badge del tab se refresca al momento
  } catch {
    // tabla aún no migrada o sin red: el badge simplemente no se actualiza
  }
}

// ---- Tiempo real ----

// El payload INSERT de Realtime trae la fila cruda, sin el embed de profiles:
// el caller resuelve alias/avatar contra el roster que ya tenga cargado.
// UPDATE/DELETE requieren replica identity full (migr. 00027) para filtrar.
export function subscribeToConversation<T>(
  scope: ChatScope,
  id: string,
  handlers: {
    onInsert: (row: T) => void;
    onUpdate?: (row: T) => void;
    onDelete?: (id: string) => void;
  }
) {
  const filter = {
    schema: 'public',
    table: scope.table,
    filter: `${scope.column}=eq.${id}`,
  };
  return uniqueChannel(`${scope.table}:${id}`)
    .on('postgres_changes', { ...filter, event: 'INSERT' }, (payload) =>
      handlers.onInsert(payload.new as T)
    )
    .on('postgres_changes', { ...filter, event: 'UPDATE' }, (payload) =>
      handlers.onUpdate?.(payload.new as T)
    )
    .on('postgres_changes', { ...filter, event: 'DELETE' }, (payload) => {
      const old = payload.old as { id?: string };
      if (old.id) handlers.onDelete?.(old.id);
    })
    .subscribe();
}

/**
 * Reacciones en vivo de UNA conversación. El filtro por ámbito depende de la
 * migración 00042; sin ella se escucha la tabla entera, como se hacía antes.
 */
export function subscribeToConversationReactions(
  scope: ChatScope,
  id: string,
  handlers: { onAdd: (e: ReactionEvent) => void; onRemove: (e: ReactionEvent) => void }
): Subscription {
  const { table, column } = scope.reactions;
  return subscribeScoped(table, column, (filtered) => {
    const base = {
      schema: 'public',
      table,
      ...(filtered ? { filter: `${column}=eq.${id}` } : {}),
    };
    return uniqueChannel(`${table}:${id}`)
      .on('postgres_changes', { ...base, event: 'INSERT' }, (payload) =>
        handlers.onAdd(payload.new as ReactionEvent)
      )
      .on('postgres_changes', { ...base, event: 'DELETE' }, (payload) => {
        const old = payload.old as Partial<ReactionEvent>;
        if (old.message_id && old.user_id && old.emoji) {
          handlers.onRemove(old as ReactionEvent);
        }
      })
      .subscribe();
  });
}
