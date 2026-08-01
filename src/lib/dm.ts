// Chat 1-a-1 (issue #42): hilos privados entre usuarios que comparten mesa.
// Mismo contrato de mensajes que el chat de mesa (text/gif/sticker) para
// reutilizar la UI. Todas las lecturas degradan con gracia si la migración
// 00025 no está aplicada (patrón fetchMyChats/chat_reads).

import type { RealtimeChannel } from '@supabase/supabase-js';

import { rollSummary, type DiceRoll } from '@/lib/dice';
import { messagePreview, type ChatSummary, type MessageKind } from '@/lib/messages';
import { fetchBlockRelations } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import { emitUnreadChanged } from '@/lib/unread-events';

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

const DM_MESSAGE_SELECT = 'id, thread_id, sender_id, body, kind, media_url, created_at, edited_at';

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

/**
 * Últimos `limit` mensajes del hilo, más reciente primero (FlatList
 * invertido). `before` pagina hacia atrás.
 */
export async function fetchDmMessages(
  threadId: string,
  limit = 100,
  before?: string
): Promise<DmMessage[]> {
  let query = supabase
    .from('dm_messages')
    .select(DM_MESSAGE_SELECT)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DmMessage[];
}

export async function sendDmMessage(
  threadId: string,
  senderId: string,
  body: string
): Promise<DmMessage> {
  const { data, error } = await supabase
    .from('dm_messages')
    .insert({ thread_id: threadId, sender_id: senderId, body: body.trim(), kind: 'text' })
    .select(DM_MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as DmMessage;
}

export async function sendDmMediaMessage(
  threadId: string,
  senderId: string,
  kind: 'gif' | 'sticker',
  content: { mediaUrl?: string; body?: string }
): Promise<DmMessage> {
  const { data, error } = await supabase
    .from('dm_messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      kind,
      media_url: content.mediaUrl ?? null,
      body: content.body ?? null,
    })
    .select(DM_MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as DmMessage;
}

/** Foto al 1-a-1 (migr. 00038). */
export async function sendDmImageMessage(
  threadId: string,
  senderId: string,
  mediaUrl: string
): Promise<DmMessage> {
  const { data, error } = await supabase
    .from('dm_messages')
    .insert({ thread_id: threadId, sender_id: senderId, kind: 'image', media_url: mediaUrl })
    .select(DM_MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as DmMessage;
}

/** Tirada de dados al 1-a-1: body legible + JSON en media_url (migr. 00031). */
export async function sendDmRollMessage(
  threadId: string,
  senderId: string,
  roll: DiceRoll
): Promise<DmMessage> {
  const { data, error } = await supabase
    .from('dm_messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      kind: 'roll',
      body: rollSummary(roll),
      media_url: JSON.stringify(roll),
    })
    .select(DM_MESSAGE_SELECT)
    .single();
  if (error) throw error;
  return data as DmMessage;
}

// ---- Reacciones del 1-a-1 (migr. 00036) ----

export async function fetchDmReactions(
  messageIds: string[],
  viewerId: string
): Promise<Map<string, { emoji: string; count: number; mine: boolean }[]>> {
  const map = new Map<string, { emoji: string; count: number; mine: boolean }[]>();
  if (messageIds.length === 0) return map;
  try {
    const { data, error } = await supabase
      .from('dm_message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds);
    if (error) throw error;
    for (const row of (data ?? []) as { message_id: string; user_id: string; emoji: string }[]) {
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

export async function toggleDmReaction(
  messageId: string,
  userId: string,
  emoji: string,
  on: boolean
) {
  if (on) {
    const { error } = await supabase
      .from('dm_message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('dm_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) throw error;
  }
}

export function subscribeToDmReactions(
  key: string,
  handlers: {
    onAdd: (e: { message_id: string; user_id: string; emoji: string }) => void;
    onRemove: (e: { message_id: string; user_id: string; emoji: string }) => void;
  }
): RealtimeChannel {
  return supabase
    .channel(`dm-reactions:${key}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'dm_message_reactions' },
      (payload) =>
        handlers.onAdd(payload.new as { message_id: string; user_id: string; emoji: string })
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'dm_message_reactions' },
      (payload) => {
        const old = payload.old as Partial<{ message_id: string; user_id: string; emoji: string }>;
        if (old.message_id && old.user_id && old.emoji) {
          handlers.onRemove(old as { message_id: string; user_id: string; emoji: string });
        }
      }
    )
    .subscribe();
}

/** Edita un mensaje propio (la RLS rechaza los ajenos). */
export async function editDmMessage(messageId: string, body: string) {
  const { error } = await supabase
    .from('dm_messages')
    .update({ body: body.trim(), edited_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw error;
}

/** Borra un mensaje propio (la RLS rechaza los ajenos). */
export async function deleteDmMessage(messageId: string) {
  const { error } = await supabase.from('dm_messages').delete().eq('id', messageId);
  if (error) throw error;
}

// UPDATE/DELETE requieren replica identity full (migr. 00027) para filtrar.
export function subscribeToDmMessages(
  threadId: string,
  handlers: {
    onInsert: (row: DmMessage) => void;
    onUpdate?: (row: DmMessage) => void;
    onDelete?: (id: string) => void;
  }
): RealtimeChannel {
  const filter = { schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` };
  return supabase
    .channel(`dm:${threadId}`)
    .on('postgres_changes', { ...filter, event: 'INSERT' }, (payload) =>
      handlers.onInsert(payload.new as DmMessage)
    )
    .on('postgres_changes', { ...filter, event: 'UPDATE' }, (payload) =>
      handlers.onUpdate?.(payload.new as DmMessage)
    )
    .on('postgres_changes', { ...filter, event: 'DELETE' }, (payload) => {
      const old = payload.old as { id?: string };
      if (old.id) handlers.onDelete?.(old.id);
    })
    .subscribe();
}

export function unsubscribeFromDmMessages(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}

/** Mi última lectura de este hilo (para el separador «nuevos»). */
export async function fetchDmLastRead(threadId: string, userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('dm_reads')
      .select('last_read_at')
      .eq('thread_id', threadId)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.last_read_at ?? null;
  } catch {
    return null;
  }
}

/** Marca el hilo como leído hasta ahora (best effort). */
export async function markDmRead(threadId: string, userId: string) {
  try {
    await supabase
      .from('dm_reads')
      .upsert({ thread_id: threadId, user_id: userId, last_read_at: new Date().toISOString() });
    emitUnreadChanged(); // el badge del tab se refresca al momento
  } catch {
    // sin migración o sin red: el badge simplemente no se actualiza
  }
}

/** Mis hilos 1-a-1 con último mensaje y no-leídos. [] si la migración falta. */
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
    const threads = (allThreads ?? []).filter(
      (t) => !blocked.has(t.user_lo === userId ? t.user_hi : t.user_lo)
    );
    if (threads.length === 0) return [];

    const threadIds = threads.map((t) => t.id);
    const otherIds = threads.map((t) => (t.user_lo === userId ? t.user_hi : t.user_lo));

    const [{ data: profiles }, { data: recent, error: msgError }, { data: reads }] =
      await Promise.all([
        supabase.from('profiles').select('id, alias, avatar_url').in('id', otherIds),
        supabase
          .from('dm_messages')
          .select('thread_id, sender_id, body, kind, created_at')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('dm_reads').select('thread_id, last_read_at').eq('user_id', userId),
      ]);
    if (msgError) throw msgError;

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const readByThread = new Map((reads ?? []).map((r) => [r.thread_id, r.last_read_at]));

    const lastByThread = new Map<string, DmSummary['lastMessage']>();
    const unreadByThread = new Map<string, number>();
    for (const row of recent ?? []) {
      if (!lastByThread.has(row.thread_id)) {
        lastByThread.set(row.thread_id, {
          body: messagePreview(row as { body: string | null; kind: MessageKind }),
          sender: null, // en un 1-a-1 el nombre del emisor sobra
          created_at: row.created_at,
        });
      }
      const lastRead = readByThread.get(row.thread_id);
      if (row.sender_id !== userId && (!lastRead || row.created_at > lastRead)) {
        unreadByThread.set(row.thread_id, (unreadByThread.get(row.thread_id) ?? 0) + 1);
      }
    }

    return threads.map((t) => {
      const otherId = t.user_lo === userId ? t.user_hi : t.user_lo;
      const profile = profileById.get(otherId);
      return {
        threadId: t.id,
        otherId,
        name: profile?.alias ?? 'Jugador/a',
        imageUrl: profile?.avatar_url ?? null,
        lastMessage: lastByThread.get(t.id) ?? null,
        unread: Math.min(unreadByThread.get(t.id) ?? 0, 99),
      };
    });
  } catch {
    return [];
  }
}
