/**
 * Algoritmo de matching v1 (§7 del PRD). Módulo puro y sin dependencias para
 * poder testearlo a fondo y portarlo tal cual a una Edge Function cuando el
 * volumen lo pida; en el MVP se ejecuta en el cliente sobre listas pequeñas.
 *
 * Filtros duros (excluyentes): solape real de disponibilidad convertida a UTC,
 * idioma compatible y sistema en común (o "abierto a cualquiera").
 * Score 0-100: solape 35 % · estilo 25 % · sistema/experiencia 20 % ·
 * preferencias técnicas 10 % · fiabilidad 10 %.
 */

import type { ExperienceLevel, VttType } from '@/lib/profile';

export type AvailabilitySlot = { weekday: number; slot: number };

export type MatchPlayer = {
  timezone: string;
  languages: string[];
  open_to_any_system: boolean;
  style_combat_narrative: number;
  style_serious_humor: number;
  style_roleplay_weight: number;
  preferred_vtt: VttType;
  bio: string | null;
  avatar_url: string | null;
  availability: AvailabilitySlot[];
  systems: { system_id: number; experience: ExperienceLevel }[];
};

export type MatchGroup = {
  timezone: string;
  language: string;
  system_id: number | null;
  session_weekday: number | null;
  session_slot: number | null;
  experience_wanted: ExperienceLevel | null;
  style_combat_narrative: number;
  style_serious_humor: number;
  style_roleplay_weight: number;
  vtt: VttType;
};

export type MatchBreakdown = {
  availability: number;
  style: number;
  system: number;
  tech: number;
  reliability: number;
};

export type MatchResult = {
  pass: boolean;
  reasons: string[]; // filtros duros incumplidos: 'availability' | 'language' | 'system'
  score: number; // 0-100 (0 si no pasa los filtros)
  overlapHours: number;
  breakdown: MatchBreakdown;
};

// Franjas de 6 h en hora local; weekday 0 = lunes (como en la DB).
// La noche cruza la medianoche a propósito (20:00–02:00).
const SLOT_START_HOUR: Record<number, number> = { 0: 8, 1: 14, 2: 20, 3: 2 };
export const SLOT_DURATION_HOURS = 6;

// Resolución de 15 min: exacta para todos los offsets reales (…:00, :30, :45).
const CELL_MINUTES = 15;
const WEEK_MINUTES = 7 * 24 * 60;

// Solape mínimo para considerar "real" el filtro duro nº 1. Media franja:
// tolera desfases horarios parciales sin emparejar imposibles.
export const MIN_OVERLAP_HOURS = 3;

/** Offset UTC en minutos de una zona IANA en un instante dado. */
export function getOffsetMinutes(timeZone: string, at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute)
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * Convierte franjas locales (día × franja) a celdas de 15 min de la semana UTC.
 * `at` fija el offset (DST): por defecto, el del momento de la consulta.
 */
export function toUtcCells(
  slots: AvailabilitySlot[],
  timeZone: string,
  at: Date
): Set<number> {
  const offset = getOffsetMinutes(timeZone, at);
  const cells = new Set<number>();
  for (const { weekday, slot } of slots) {
    const startLocalMin = weekday * 24 * 60 + SLOT_START_HOUR[slot] * 60;
    for (let m = 0; m < SLOT_DURATION_HOURS * 60; m += CELL_MINUTES) {
      const utcMin = (((startLocalMin + m - offset) % WEEK_MINUTES) + WEEK_MINUTES) % WEEK_MINUTES;
      cells.add(utcMin / CELL_MINUTES);
    }
  }
  return cells;
}

export function overlapHours(a: Set<number>, b: Set<number>): number {
  let cells = 0;
  for (const cell of a) if (b.has(cell)) cells++;
  return (cells * CELL_MINUTES) / 60;
}

const EXPERIENCE_ORDER: ExperienceLevel[] = ['none', 'beginner', 'intermediate', 'veteran'];

function experiencePoints(
  wanted: ExperienceLevel | null,
  actual: ExperienceLevel | undefined
): number {
  if (wanted === null || actual === undefined) return 8;
  const distance = Math.abs(EXPERIENCE_ORDER.indexOf(wanted) - EXPERIENCE_ORDER.indexOf(actual));
  if (distance === 0) return 8;
  if (distance === 1) return 5;
  return 2;
}

function styleScore(player: MatchPlayer, group: MatchGroup): number {
  const diffs = [
    Math.abs(player.style_combat_narrative - group.style_combat_narrative),
    Math.abs(player.style_serious_humor - group.style_serious_humor),
    Math.abs(player.style_roleplay_weight - group.style_roleplay_weight),
  ];
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return (1 - avgDiff / 100) * 25;
}

/**
 * Fiabilidad (10 %): sin valoraciones todavía (fase 3), usamos un proxy de
 * completitud de perfil para no dejar el componente a cero.
 */
function reliabilityScore(player: MatchPlayer): number {
  let score = 4;
  if (player.bio && player.bio.trim().length > 0) score += 3;
  if (player.avatar_url) score += 3;
  return score;
}

export function matchPlayerToGroup(
  player: MatchPlayer,
  group: MatchGroup,
  at: Date = new Date()
): MatchResult {
  const reasons: string[] = [];

  // Filtro duro 1: solape horario en UTC
  let hours = 0;
  let availabilityScore: number;
  if (group.session_weekday === null || group.session_slot === null) {
    // Mesa sin horario definido: no excluye, pero solo da crédito parcial.
    availabilityScore = 35 / 2;
  } else {
    const playerCells = toUtcCells(player.availability, player.timezone, at);
    const sessionCells = toUtcCells(
      [{ weekday: group.session_weekday, slot: group.session_slot }],
      group.timezone,
      at
    );
    hours = overlapHours(playerCells, sessionCells);
    if (hours < MIN_OVERLAP_HOURS) reasons.push('availability');
    availabilityScore = Math.min(hours / SLOT_DURATION_HOURS, 1) * 35;
  }

  // Filtro duro 2: idioma
  if (!player.languages.includes(group.language)) reasons.push('language');

  // Filtro duro 3: sistema en común (o abierto a cualquiera)
  const playsSystem =
    group.system_id !== null && player.systems.some((s) => s.system_id === group.system_id);
  if (!playsSystem && !player.open_to_any_system) reasons.push('system');

  const systemScore = playsSystem
    ? 12 +
      experiencePoints(
        group.experience_wanted,
        player.systems.find((s) => s.system_id === group.system_id)?.experience
      )
    : player.open_to_any_system
      ? 6
      : 0;

  const techScore = player.preferred_vtt === group.vtt ? 10 : 4;

  const breakdown: MatchBreakdown = {
    availability: availabilityScore,
    style: styleScore(player, group),
    system: systemScore,
    tech: techScore,
    reliability: reliabilityScore(player),
  };

  const pass = reasons.length === 0;
  const score = pass
    ? Math.min(
        100,
        Math.round(
          breakdown.availability +
            breakdown.style +
            breakdown.system +
            breakdown.tech +
            breakdown.reliability
        )
      )
    : 0;

  return { pass, reasons, score, overlapHours: hours, breakdown };
}
