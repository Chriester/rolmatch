// Tests de la parte pura del feed: a quién se descarta y en qué orden salen
// los candidatos. Es la lógica que se reescribió al sacar la consulta del
// bucle por mesa, y hasta ahora no tenía red de seguridad.

import { buildCandidates, tallyFilteredOut } from '@/lib/feed';
import type { MatchGroup, MatchResult } from '@/lib/matching';

const TZ = 'UTC';
const MONDAY = 0;
const AFTERNOON = 1;

const GROUP: MatchGroup = {
  timezone: TZ,
  language: 'es',
  system_id: 1,
  session_weekday: MONDAY,
  session_slot: AFTERNOON,
  experience_wanted: null,
  style_combat_narrative: 50,
  style_serious_humor: 50,
  style_roleplay_weight: 50,
  vtt: 'discord_only',
};

type PoolRow = Parameters<typeof buildCandidates>[0][number];

function poolMember(id: string, overrides: Partial<PoolRow> = {}): PoolRow {
  return {
    id,
    alias: `jugador-${id}`,
    role: 'player',
    gender: null,
    birth_year: 1990,
    timezone: TZ,
    languages: ['es'],
    open_to_any_system: false,
    bio: 'Llevo años jugando',
    avatar_url: 'https://example.com/a.png',
    style_combat_narrative: 50,
    style_serious_humor: 50,
    style_roleplay_weight: 50,
    preferred_vtt: 'discord_only',
    availability_slots: [{ weekday: MONDAY, slot: AFTERNOON }],
    user_systems: [{ system_id: 1, experience: 'intermediate' }],
    characters: [],
    ...overrides,
  } as PoolRow;
}

const noExclusions = () => ({
  excluded: new Set<string>(),
  likesByUser: new Map<string, string | null>(),
});
const noScores = () => ({
  reliability: new Map<string, { average: number; count: number }>(),
  xp: new Map<string, number>(),
});

function build(
  pool: PoolRow[],
  exclusions = noExclusions(),
  onlyApplicants = false
) {
  const { reliability, xp } = noScores();
  return buildCandidates(pool, GROUP, exclusions, reliability, xp, onlyApplicants);
}

describe('buildCandidates', () => {
  it('deja pasar a un candidato compatible', () => {
    const result = build([poolMember('a')]);
    expect(result.map((c) => c.player.id)).toEqual(['a']);
  });

  it('descarta a los excluidos (miembros, swipes previos, bloqueados)', () => {
    const exclusions = noExclusions();
    exclusions.excluded.add('b');
    const result = build([poolMember('a'), poolMember('b')], exclusions);
    expect(result.map((c) => c.player.id)).toEqual(['a']);
  });

  it('descarta a quien no tiene disponibilidad', () => {
    const result = build([poolMember('a', { availability_slots: [] })]);
    expect(result).toHaveLength(0);
  });

  it('pone primero a quien ya dio like a la mesa, aunque puntúe peor', () => {
    const exclusions = noExclusions();
    exclusions.likesByUser.set('b', null);
    // «a» encaja mejor en estilo; «b» ha pedido sitio y debe ir delante
    const result = build(
      [
        poolMember('a'),
        poolMember('b', { style_combat_narrative: 0, style_serious_humor: 100 }),
      ],
      exclusions
    );
    expect(result.map((c) => c.player.id)).toEqual(['b', 'a']);
    expect(result[0].likedGroup).toBe(true);
    expect(result[1].likedGroup).toBe(false);
  });

  it('en modo solicitudes solo salen los que pidieron sitio, sin exigir compatibilidad', () => {
    const exclusions = noExclusions();
    exclusions.likesByUser.set('b', null);
    const result = build(
      [
        poolMember('a'),
        // sin disponibilidad y en otra zona: fallaría los filtros duros
        poolMember('b', { availability_slots: [], timezone: 'Asia/Tokyo' }),
      ],
      exclusions,
      true
    );
    expect(result.map((c) => c.player.id)).toEqual(['b']);
  });

  it('en modo solicitudes un excluido (pass previo de la mesa) no vuelve', () => {
    const exclusions = noExclusions();
    exclusions.likesByUser.set('b', null);
    exclusions.excluded.add('b');
    const result = build([poolMember('b')], exclusions, true);
    expect(result).toHaveLength(0);
  });

  it('adjunta el personaje propuesto al pedir sitio', () => {
    const exclusions = noExclusions();
    exclusions.likesByUser.set('a', 'char-1');
    const characters = [
      { id: 'char-1', name: 'Vex', archetype: null, level: null, gender: null, age: null,
        concept: null, backstory: null, portrait_url: null, status: 'looking',
        is_public: true, traits: {}, sheet_theme: null, systems: null },
    ];
    const result = build([poolMember('a', { characters })], exclusions, true);
    expect(result[0].proposal?.name).toBe('Vex');
  });
});

// El recuento que explica el feed vacío (y que ahora viaja en feed_empty):
// si miente, mandamos al usuario a ajustar lo que no era.
describe('tallyFilteredOut', () => {
  const result = (pass: boolean, reasons: string[] = []): MatchResult => ({
    pass,
    reasons,
    score: pass ? 50 : 0,
    overlapHours: 0,
    breakdown: { availability: 0, style: 0, system: 0, tech: 0, reliability: 0 },
  });

  it('solo cuenta lo que NO pasa, motivo a motivo', () => {
    const tally = tallyFilteredOut([
      result(true),
      result(false, ['availability']),
      result(false, ['system', 'language']),
    ]);
    expect(tally).toEqual({ total: 2, schedule: 1, system: 1, language: 1 });
  });

  it('una mesa caída por varios motivos suma en cada uno pero una vez en total', () => {
    const tally = tallyFilteredOut([result(false, ['availability', 'system', 'language'])]);
    expect(tally.total).toBe(1);
    expect(tally.schedule + tally.system + tally.language).toBe(3);
  });

  it('todo pasa: todo a cero (el vacío se explica por falta de inventario)', () => {
    expect(tallyFilteredOut([result(true), result(true)])).toEqual({
      total: 0,
      schedule: 0,
      system: 0,
      language: 0,
    });
  });
});
