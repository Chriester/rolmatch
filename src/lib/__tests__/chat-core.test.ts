// El chat de mesa y el 1-a-1 comparten mecánica desde chat-core: estos tests
// fijan que cada conversación siga hablando con SUS tablas y columnas (el
// riesgo real de haberlos unificado) y cubren la lógica pura de siempre.

const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
  uniqueChannel: jest.fn(),
  subscribeScoped: jest.fn(),
}));
jest.mock('@/lib/unread-events', () => ({ emitUnreadChanged: jest.fn() }));

// Los imports van DESPUÉS del mock a propósito: si suben, chat-core pide
// @/lib/supabase antes de que mockFrom exista y la fábrica revienta.
// eslint-disable-next-line import/first
import {
  DM_CHAT,
  GROUP_CHAT,
  fetchConversation,
  groupReactions,
  insertMessage,
  markRead,
  messagePreview,
  toggleReaction,
  type ReactionEvent,
} from '@/lib/chat-core';

/** Constructor de consultas de mentira: encadena y apunta lo que le piden. */
function fakeBuilder(result: unknown = { data: [], error: null }) {
  const calls: [string, ...unknown[]][] = [];
  const builder: Record<string, unknown> = {};
  const methods = [
    'select', 'eq', 'order', 'limit', 'lt', 'in',
    'insert', 'update', 'delete', 'upsert', 'single', 'maybeSingle',
  ];
  for (const method of methods) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return { builder, calls };
}

function arm(result?: unknown) {
  const { builder, calls } = fakeBuilder(result);
  mockFrom.mockReset();
  mockFrom.mockReturnValue(builder);
  return calls;
}

describe('messagePreview', () => {
  it('describe cada tipo sin body legible', () => {
    expect(messagePreview({ body: 'hola', kind: 'text' })).toBe('hola');
    expect(messagePreview({ body: null, kind: 'gif' })).toBe('GIF');
    expect(messagePreview({ body: '🎟️', kind: 'sticker' })).toBe('🎟️ sticker');
    expect(messagePreview({ body: '1d20 → 17', kind: 'roll' })).toBe('1d20 → 17');
    expect(messagePreview({ body: null, kind: 'image' })).toBe('Foto');
  });

  it('no revienta con un texto vacío', () => {
    expect(messagePreview({ body: null, kind: 'text' })).toBe('');
  });
});

describe('groupReactions', () => {
  const rows: ReactionEvent[] = [
    { message_id: 'm1', user_id: 'yo', emoji: '👍' },
    { message_id: 'm1', user_id: 'otro', emoji: '👍' },
    { message_id: 'm1', user_id: 'otro', emoji: '🎲' },
    { message_id: 'm2', user_id: 'otro', emoji: '❤️' },
  ];

  it('cuenta por emoji y separa por mensaje', () => {
    const map = groupReactions(rows, 'yo');
    expect(map.get('m1')).toEqual([
      { emoji: '👍', count: 2, mine: true },
      { emoji: '🎲', count: 1, mine: false },
    ]);
    expect(map.get('m2')).toEqual([{ emoji: '❤️', count: 1, mine: false }]);
  });

  it('marca mine solo donde he reaccionado yo', () => {
    const map = groupReactions(rows, 'otro');
    expect(map.get('m1')?.[0].mine).toBe(true);
    expect(map.get('m2')?.[0].mine).toBe(true);
  });
});

describe('ámbito de cada conversación', () => {
  it('el chat de mesa lee messages acotando por group_id', async () => {
    const calls = arm();
    await fetchConversation(GROUP_CHAT, 'g1');
    expect(mockFrom).toHaveBeenCalledWith('messages');
    expect(calls).toContainEqual(['eq', 'group_id', 'g1']);
  });

  it('el 1-a-1 lee dm_messages acotando por thread_id', async () => {
    const calls = arm();
    await fetchConversation(DM_CHAT, 't1');
    expect(mockFrom).toHaveBeenCalledWith('dm_messages');
    expect(calls).toContainEqual(['eq', 'thread_id', 't1']);
  });

  it('pagina hacia atrás solo cuando se le pide', async () => {
    const sinBefore = arm();
    await fetchConversation(GROUP_CHAT, 'g1');
    expect(sinBefore.some(([method]) => method === 'lt')).toBe(false);

    const conBefore = arm();
    await fetchConversation(GROUP_CHAT, 'g1', 50, '2026-01-01T00:00:00Z');
    expect(conBefore).toContainEqual(['lt', 'created_at', '2026-01-01T00:00:00Z']);
    expect(conBefore).toContainEqual(['limit', 50]);
  });

  it('inserta con la columna de ámbito que toca', async () => {
    const calls = arm({ data: { id: 'm1' }, error: null });
    await insertMessage(DM_CHAT, 't1', 'yo', { kind: 'text', body: 'hola' });
    expect(mockFrom).toHaveBeenCalledWith('dm_messages');
    expect(calls[0]).toEqual([
      'insert',
      { thread_id: 't1', sender_id: 'yo', kind: 'text', body: 'hola', media_url: null },
    ]);
  });

  it('las reacciones van a su tabla', async () => {
    arm({ data: null, error: null });
    await toggleReaction(GROUP_CHAT, 'm1', 'yo', '👍', true);
    expect(mockFrom).toHaveBeenCalledWith('message_reactions');

    arm({ data: null, error: null });
    await toggleReaction(DM_CHAT, 'm1', 'yo', '👍', true);
    expect(mockFrom).toHaveBeenCalledWith('dm_message_reactions');
  });

  it('las lecturas van a su tabla y con su clave', async () => {
    const calls = arm({ data: null, error: null });
    await markRead(DM_CHAT, 't1', 'yo');
    expect(mockFrom).toHaveBeenCalledWith('dm_reads');
    const [method, payload] = calls[0] as [string, Record<string, unknown>];
    expect(method).toBe('upsert');
    expect(payload.thread_id).toBe('t1');
    expect(payload.user_id).toBe('yo');
  });
});
