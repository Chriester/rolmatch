// Tiradas de dados del chat — módulo PURO (sin supabase) para que Jest lo
// cubra sin cargar nada nativo. La tirada viaja en el mensaje como JSON
// (media_url) + resumen legible (body).

export const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

export const MAX_DICE = 10;
export const MAX_MODIFIER = 20;

export type DiceRoll = {
  sides: number;
  count: number;
  modifier: number;
  rolls: number[];
  total: number;
};

/** "3d8+2" / "d20" / "2d6-1" */
export function rollFormula(roll: Pick<DiceRoll, 'sides' | 'count' | 'modifier'>): string {
  const base = `${roll.count > 1 ? roll.count : ''}d${roll.sides}`;
  if (roll.modifier > 0) return `${base}+${roll.modifier}`;
  if (roll.modifier < 0) return `${base}${roll.modifier}`;
  return base;
}

export function rollDice(
  count: number,
  sides: number,
  modifier: number,
  rng: () => number = Math.random
): DiceRoll {
  const safeCount = Math.min(Math.max(Math.round(count), 1), MAX_DICE);
  const safeModifier = Math.min(Math.max(Math.round(modifier), -MAX_MODIFIER), MAX_MODIFIER);
  const rolls = Array.from({ length: safeCount }, () => 1 + Math.floor(rng() * sides));
  return {
    sides,
    count: safeCount,
    modifier: safeModifier,
    rolls,
    total: rolls.reduce((sum, r) => sum + r, 0) + safeModifier,
  };
}

/** Resumen legible para body, previews y pushes: «🎲 2d6+3 = 9 (4, 2)» */
export function rollSummary(roll: DiceRoll): string {
  const detail = roll.rolls.length > 1 || roll.modifier !== 0 ? ` (${roll.rolls.join(', ')})` : '';
  return `🎲 ${rollFormula(roll)} = ${roll.total}${detail}`;
}

/** Parse defensivo del JSON de media_url; null si no es una tirada válida. */
export function parseRoll(json: string | null): DiceRoll | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Partial<DiceRoll>;
    if (
      typeof parsed.sides !== 'number' ||
      typeof parsed.total !== 'number' ||
      !Array.isArray(parsed.rolls) ||
      parsed.rolls.some((r) => typeof r !== 'number')
    ) {
      return null;
    }
    return {
      sides: parsed.sides,
      count: parsed.count ?? parsed.rolls.length,
      modifier: parsed.modifier ?? 0,
      rolls: parsed.rolls,
      total: parsed.total,
    };
  } catch {
    return null;
  }
}
