// La parte pura de Novedades: qué solicitud cuenta como pendiente y cómo se
// decide que un item ya está visto. Ambas tuvieron bug o casi-bug (las
// solicitudes resueltas se quedaban 14 días; un timestamp-marca habría roto
// el punto con las partidas de fecha futura).

import { fingerprints, pendingApplicants, type ApplicantSwipe } from '@/lib/activity';

const like = (userId: string, groupId: string, at: string): ApplicantSwipe => ({
  user_id: userId,
  group_id: groupId,
  created_at: at,
});

describe('pendingApplicants', () => {
  it('agrupa por mesa y se queda con la fecha más reciente', () => {
    const result = pendingApplicants(
      [
        like('ana', 'mesa1', '2026-08-01T10:00:00Z'),
        like('bea', 'mesa1', '2026-08-03T10:00:00Z'),
        like('carlos', 'mesa2', '2026-08-02T10:00:00Z'),
      ],
      new Set()
    );
    expect(result.get('mesa1')).toEqual({ count: 2, at: '2026-08-03T10:00:00Z' });
    expect(result.get('mesa2')).toEqual({ count: 1, at: '2026-08-02T10:00:00Z' });
  });

  it('excluye lo ya resuelto: decisión del GM o miembro actual', () => {
    const result = pendingApplicants(
      [
        like('aceptada', 'mesa1', '2026-08-01T10:00:00Z'),
        like('pendiente', 'mesa1', '2026-08-02T10:00:00Z'),
      ],
      new Set(['mesa1:aceptada'])
    );
    expect(result.get('mesa1')).toEqual({ count: 1, at: '2026-08-02T10:00:00Z' });
  });

  it('la misma persona resuelta en una mesa sigue pendiente en otra', () => {
    const result = pendingApplicants(
      [like('ana', 'mesa1', '2026-08-01T10:00:00Z'), like('ana', 'mesa2', '2026-08-01T10:00:00Z')],
      new Set(['mesa1:ana'])
    );
    expect(result.has('mesa1')).toBe(false);
    expect(result.get('mesa2')?.count).toBe(1);
  });

  it('sin nada pendiente devuelve un mapa vacío (la tarjeta no sale)', () => {
    const result = pendingApplicants(
      [like('ana', 'mesa1', '2026-08-01T10:00:00Z')],
      new Set(['mesa1:ana'])
    );
    expect(result.size).toBe(0);
  });
});

describe('fingerprints', () => {
  it('una partida futura ya vista no tapa una novedad posterior', () => {
    // El caso que descarta el diseño de timestamp-marca: la sesión del
    // sábado (futuro) se ve hoy; un match de mañana debe seguir siendo nuevo.
    const seen = new Set(fingerprints([{ id: 'session-1', at: '2026-08-15T20:00:00Z' }]));
    const fresh = fingerprints([
      { id: 'session-1', at: '2026-08-15T20:00:00Z' },
      { id: 'match-9', at: '2026-08-11T09:00:00Z' },
    ]);
    expect(fresh.filter((mark) => !seen.has(mark))).toEqual(['match-9@2026-08-11T09:00:00Z']);
  });

  it('una solicitud nueva sobre solicitudes viejas vuelve a contar como no vista', () => {
    // mismo id agregado por mesa, fecha distinta ⇒ huella distinta
    const seen = new Set(fingerprints([{ id: 'applicants-mesa1', at: '2026-08-01T10:00:00Z' }]));
    const fresh = fingerprints([{ id: 'applicants-mesa1', at: '2026-08-05T10:00:00Z' }]);
    expect(fresh.some((mark) => !seen.has(mark))).toBe(true);
  });
});
