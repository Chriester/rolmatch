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
