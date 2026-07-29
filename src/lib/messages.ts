import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type MessageKind = 'text' | 'gif' | 'sticker';

export type ChatMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string | null;
  kind: MessageKind;
  media_url: string | null;
  created_at: string;
  profiles: { alias: string; avatar_url: string | null } | null;
};

const MESSAGE_SELECT =
  'id, group_id, sender_id, body, kind, media_url, created_at, profiles(alias, avatar_url)';

/** Preview de un mensaje para listas (los media no tienen body legible) */
export function messagePreview(message: { body: string | null; kind: MessageKind }): string {
  if (message.kind === 'gif') return '🎞️ GIF';
  if (message.kind === 'sticker') return `${message.body ?? '🎟️'} sticker`;
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
        .select('group_id, sender_id, body, kind, created_at, profiles(alias)')
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

/** Marca el chat como leído hasta ahora (best effort: sin migración, no-op). */
export async function markChatRead(groupId: string, userId: string) {
  try {
    await supabase
      .from('chat_reads')
      .upsert({ group_id: groupId, user_id: userId, last_read_at: new Date().toISOString() });
  } catch {
    // tabla aún no migrada o sin red: el badge simplemente no se actualiza
  }
}

// Ultimos `limit` mensajes de la mesa, mas reciente primero (para FlatList invertido).
export async function fetchMessages(groupId: string, limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);
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

// El payload INSERT de Realtime trae la fila cruda, sin el embed de
// profiles: el caller resuelve alias/avatar contra group.group_members.
export function subscribeToMessages(
  groupId: string,
  onInsert: (row: Omit<ChatMessage, 'profiles'>) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:group:${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
      (payload) => onInsert(payload.new as Omit<ChatMessage, 'profiles'>)
    )
    .subscribe();
}

export function unsubscribeFromMessages(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
