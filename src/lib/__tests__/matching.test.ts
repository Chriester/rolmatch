import {
  MIN_OVERLAP_HOURS,
  getOffsetMinutes,
  matchPlayerToGroup,
  overlapHours,
  toUtcCells,
  type MatchGroup,
  type MatchPlayer,
} from '@/lib/matching';

// Fecha fija y zonas sin DST para que los tests sean deterministas todo el año.
const AT = new Date('2026-01-15T12:00:00Z');
const TZ_UTC = 'UTC';
const TZ_TOKYO = 'Asia/Tokyo'; // +9:00
const TZ_BUENOS_AIRES = 'America/Argentina/Buenos_Aires'; // −3:00
const TZ_KOLKATA = 'Asia/Kolkata'; // +5:30

// weekday 0 = lunes · slots: 0 mañana 8-14, 1 tarde 14-20, 2 noche 20-02, 3 madrugada 02-08
const MONDAY = 0;
const SUNDAY = 6;
const MORNING = 0;
const AFTERNOON = 1;
const NIGHT = 2;
const LATE_NIGHT = 3;

function basePlayer(overrides: Partial<MatchPlayer> = {}): MatchPlayer {
  return {
    timezone: TZ_UTC,
    languages: ['es'],
    open_to_any_system: false,
    style_combat_narrative: 50,
    style_serious_humor: 50,
    style_roleplay_weight: 50,
    preferred_vtt: 'discord_only',
    bio: 'Llevo años dirigiendo',
    avatar_url: 'https://example.com/a.png',
    availability: [{ weekday: MONDAY, slot: AFTERNOON }],
    systems: [{ system_id: 1, experience: 'intermediate' }],
    ...overrides,
  };
}

function baseGroup(overrides: Partial<MatchGroup> = {}): MatchGroup {
  return {
    timezone: TZ_UTC,
    language: 'es',
    system_id: 1,
    session_weekday: MONDAY,
    session_slot: AFTERNOON,
    experience_wanted: null,
    style_combat_narrative: 50,
    style_serious_humor: 50,
    style_roleplay_weight: 50,
    vtt: 'discord_only',
    ...overrides,
  };
}

describe('getOffsetMinutes', () => {
  it('devuelve el offset correcto de zonas conocidas', () => {
    expect(getOffsetMinutes(TZ_UTC, AT)).toBe(0);
    expect(getOffsetMinutes(TZ_TOKYO, AT)).toBe(540);
    expect(getOffsetMinutes(TZ_BUENOS_AIRES, AT)).toBe(-180);
    expect(getOffsetMinutes(TZ_KOLKATA, AT)).toBe(330);
  });
});

describe('toUtcCells / overlapHours', () => {
  it('una franja son 6 horas (24 celdas de 15 min)', () => {
    const cells = toUtcCells([{ weekday: MONDAY, slot: MORNING }], TZ_UTC, AT);
    expect(cells.size).toBe(24);
  });

  it('misma zona y misma franja: solape completo de 6 h', () => {
    const a = toUtcCells([{ weekday: MONDAY, slot: AFTERNOON }], TZ_UTC, AT);
    const b = toUtcCells([{ weekday: MONDAY, slot: AFTERNOON }], TZ_UTC, AT);
    expect(overlapHours(a, b)).toBe(6);
  });

  it('convierte a UTC: la tarde de Buenos Aires solapa 3 h con la tarde UTC', () => {
    // Lunes 14-20 en BA (−3) = lunes 17-23 UTC; vs lunes 14-20 UTC → 17-20 = 3 h
    const player = toUtcCells([{ weekday: MONDAY, slot: AFTERNOON }], TZ_BUENOS_AIRES, AT);
    const group = toUtcCells([{ weekday: MONDAY, slot: AFTERNOON }], TZ_UTC, AT);
    expect(overlapHours(player, group)).toBe(3);
  });

  it('maneja offsets de media hora (Calcuta) con exactitud', () => {
    // Lunes 14-20 en Calcuta (+5:30) = lunes 8:30-14:30 UTC; vs mañana UTC 8-14 → 5.5 h
    const player = toUtcCells([{ weekday: MONDAY, slot: AFTERNOON }], TZ_KOLKATA, AT);
    const group = toUtcCells([{ weekday: MONDAY, slot: MORNING }], TZ_UTC, AT);
    expect(overlapHours(player, group)).toBe(5.5);
  });

  it('la madrugada del lunes en Tokio cae en el domingo UTC (wrap semanal)', () => {
    // Lunes 02-08 en Tokio (+9) = domingo 17-23 UTC
    const player = toUtcCells([{ weekday: MONDAY, slot: LATE_NIGHT }], TZ_TOKYO, AT);
    const sundayEvening = toUtcCells([{ weekday: SUNDAY, slot: NIGHT }], TZ_UTC, AT);
    // Domingo noche UTC = dom 20-24 + lun 00-02 → solape dom 20-23 = 3 h
    expect(overlapHours(player, sundayEvening)).toBe(3);
  });

  it('la noche cruza la medianoche sin perder horas', () => {
    const night = toUtcCells([{ weekday: SUNDAY, slot: NIGHT }], TZ_UTC, AT);
    expect(night.size).toBe(24); // 4 h del domingo + 2 h del lunes
  });
});

describe('filtros duros', () => {
  it('excluye sin solape horario suficiente', () => {
    const result = matchPlayerToGroup(
      basePlayer({ availability: [{ weekday: MONDAY, slot: MORNING }] }),
      baseGroup({ session_weekday: MONDAY, session_slot: NIGHT }),
      AT
    );
    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('availability');
    expect(result.score).toBe(0);
  });

  it('respeta el umbral mínimo de solape real', () => {
    // BA tarde vs UTC tarde = 3 h de solape, justo el mínimo
    const result = matchPlayerToGroup(
      basePlayer({ timezone: TZ_BUENOS_AIRES }),
      baseGroup(),
      AT
    );
    expect(result.overlapHours).toBe(MIN_OVERLAP_HOURS);
    expect(result.pass).toBe(true);
  });

  it('excluye por idioma', () => {
    const result = matchPlayerToGroup(basePlayer(), baseGroup({ language: 'en' }), AT);
    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('language');
  });

  it('acepta si el jugador habla el idioma de la mesa entre varios', () => {
    const result = matchPlayerToGroup(
      basePlayer({ languages: ['es', 'en'] }),
      baseGroup({ language: 'en' }),
      AT
    );
    expect(result.pass).toBe(true);
  });

  it('excluye si no juega el sistema y no está abierto a cualquiera', () => {
    const result = matchPlayerToGroup(basePlayer(), baseGroup({ system_id: 99 }), AT);
    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('system');
  });

  it('acepta con "abierto a cualquier sistema" aunque no lo juegue', () => {
    const result = matchPlayerToGroup(
      basePlayer({ open_to_any_system: true }),
      baseGroup({ system_id: 99 }),
      AT
    );
    expect(result.pass).toBe(true);
    expect(result.breakdown.system).toBe(6);
  });

  it('una mesa sin horario definido no excluye y da crédito parcial', () => {
    const result = matchPlayerToGroup(
      basePlayer(),
      baseGroup({ session_weekday: null, session_slot: null }),
      AT
    );
    expect(result.pass).toBe(true);
    expect(result.breakdown.availability).toBe(17.5);
  });
});

describe('score', () => {
  it('un match perfecto puntúa 100', () => {
    const result = matchPlayerToGroup(basePlayer(), baseGroup(), AT);
    expect(result.score).toBe(100);
    expect(result.breakdown).toEqual({
      availability: 35,
      style: 25,
      system: 20,
      tech: 10,
      reliability: 10,
    });
  });

  it('el estilo opuesto puntúa 0 en su componente', () => {
    const result = matchPlayerToGroup(
      basePlayer({
        style_combat_narrative: 0,
        style_serious_humor: 0,
        style_roleplay_weight: 0,
      }),
      baseGroup({
        style_combat_narrative: 100,
        style_serious_humor: 100,
        style_roleplay_weight: 100,
      }),
      AT
    );
    expect(result.breakdown.style).toBe(0);
  });

  it('la experiencia puntúa más cuanto más cerca del nivel buscado', () => {
    const exact = matchPlayerToGroup(
      basePlayer({ systems: [{ system_id: 1, experience: 'veteran' }] }),
      baseGroup({ experience_wanted: 'veteran' }),
      AT
    );
    const adjacent = matchPlayerToGroup(
      basePlayer({ systems: [{ system_id: 1, experience: 'intermediate' }] }),
      baseGroup({ experience_wanted: 'veteran' }),
      AT
    );
    const far = matchPlayerToGroup(
      basePlayer({ systems: [{ system_id: 1, experience: 'none' }] }),
      baseGroup({ experience_wanted: 'veteran' }),
      AT
    );
    expect(exact.breakdown.system).toBeGreaterThan(adjacent.breakdown.system);
    expect(adjacent.breakdown.system).toBeGreaterThan(far.breakdown.system);
  });

  it('VTT distinto puntúa menos que VTT igual', () => {
    const same = matchPlayerToGroup(basePlayer(), baseGroup(), AT);
    const different = matchPlayerToGroup(
      basePlayer({ preferred_vtt: 'foundry' }),
      baseGroup({ vtt: 'roll20' }),
      AT
    );
    expect(different.breakdown.tech).toBeLessThan(same.breakdown.tech);
  });

  it('el perfil incompleto baja la fiabilidad', () => {
    const result = matchPlayerToGroup(
      basePlayer({ bio: null, avatar_url: null }),
      baseGroup(),
      AT
    );
    expect(result.breakdown.reliability).toBe(4);
  });

  it('el score siempre queda entre 0 y 100', () => {
    const worst = matchPlayerToGroup(
      basePlayer({
        timezone: TZ_BUENOS_AIRES,
        bio: null,
        avatar_url: null,
        open_to_any_system: true,
        systems: [],
        style_combat_narrative: 0,
        style_serious_humor: 100,
        style_roleplay_weight: 0,
        preferred_vtt: 'other',
      }),
      baseGroup({
        system_id: 99,
        style_combat_narrative: 100,
        style_serious_humor: 0,
        style_roleplay_weight: 100,
        vtt: 'roll20',
      }),
      AT
    );
    expect(worst.pass).toBe(true);
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
  });
});
