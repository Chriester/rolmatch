// freeSeats es la única aritmética de plazas de la app: la usan la tarjeta
// del feed, la ficha de mesa y el cierre de candidaturas del GM.

import { freeSeats } from '@/lib/groups';

const member = (userId: string) => ({
  user_id: userId,
  member_role: 'player' as const,
  profiles: null,
});

describe('freeSeats', () => {
  it('el GM no ocupa plaza', () => {
    const group = {
      max_players: 4,
      owner_id: 'gm',
      group_members: [member('gm'), member('ana'), member('bea')],
    };
    expect(freeSeats(group)).toBe(2);
  });

  it('mesa recién creada: todas las plazas libres', () => {
    expect(freeSeats({ max_players: 5, owner_id: 'gm', group_members: [member('gm')] })).toBe(5);
  });

  it('nunca devuelve negativo aunque el límite baje con la mesa llena', () => {
    // el GM puede editar max_players por debajo de los miembros actuales
    const group = {
      max_players: 1,
      owner_id: 'gm',
      group_members: [member('gm'), member('ana'), member('bea')],
    };
    expect(freeSeats(group)).toBe(0);
  });
});
