import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type ChatMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: { alias: string; avatar_url: string | null } | null;
};

const MESSAGE_SELECT = 'id, group_id, sender_id, body, created_at, profiles(alias, avatar_url)';

export type ChatSummary = {
  groupId: string;
  name: string;
  imageUrl: string | null;
  lastMessage: { body: string; sender: string | null; created_at: string } | null;
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
  const { data: recent, error: msgError } = await supabase
    .from('messages')
    .select('group_id, body, created_at, profiles(alias)')
    .in(
      'group_id',
      groups.map((g) => g.id)
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (msgError) throw msgError;

  const lastByGroup = new Map<string, ChatSummary['lastMessage']>();
  for (const row of recent ?? []) {
    if (lastByGroup.has(row.group_id)) continue;
    const sender = row.profiles as unknown as { alias: string } | null;
    lastByGroup.set(row.group_id, {
      body: row.body,
      sender: sender?.alias ?? null,
      created_at: row.created_at,
    });
  }

  return groups
    .map((g) => ({
      groupId: g.id,
      name: g.name,
      imageUrl: g.image_url,
      lastMessage: lastByGroup.get(g.id) ?? null,
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
    .insert({ group_id: groupId, sender_id: senderId, body: body.trim() })
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
