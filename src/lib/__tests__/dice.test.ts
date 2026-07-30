import { MAX_DICE, MAX_MODIFIER, parseRoll, rollDice, rollFormula, rollSummary } from '../dice';

// rng determinista que recorre una secuencia
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('rollDice', () => {
  it('respeta los límites de cada dado', () => {
    const min = rollDice(3, 20, 0, () => 0);
    expect(min.rolls).toEqual([1, 1, 1]);
    const max = rollDice(3, 20, 0, () => 0.999999);
    expect(max.rolls).toEqual([20, 20, 20]);
  });

  it('suma dados y modificador', () => {
    const roll = rollDice(2, 6, 3, seq(0, 0.999999)); // 1 y 6
    expect(roll.rolls).toEqual([1, 6]);
    expect(roll.total).toBe(10);
  });

  it('acota cantidad y modificador a los máximos', () => {
    const roll = rollDice(99, 6, 99, () => 0);
    expect(roll.count).toBe(MAX_DICE);
    expect(roll.rolls).toHaveLength(MAX_DICE);
    expect(roll.modifier).toBe(MAX_MODIFIER);
    const negative = rollDice(0, 6, -99, () => 0);
    expect(negative.count).toBe(1);
    expect(negative.modifier).toBe(-MAX_MODIFIER);
  });
});

describe('rollFormula', () => {
  it('formatea con y sin cantidad y modificador', () => {
    expect(rollFormula({ sides: 20, count: 1, modifier: 0 })).toBe('d20');
    expect(rollFormula({ sides: 8, count: 3, modifier: 2 })).toBe('3d8+2');
    expect(rollFormula({ sides: 6, count: 2, modifier: -1 })).toBe('2d6-1');
  });
});

describe('rollSummary', () => {
  it('omite el detalle en la tirada simple y lo incluye en la compuesta', () => {
    expect(rollSummary({ sides: 20, count: 1, modifier: 0, rolls: [15], total: 15 })).toBe(
      '🎲 d20 = 15'
    );
    expect(rollSummary({ sides: 6, count: 2, modifier: 3, rolls: [4, 2], total: 9 })).toBe(
      '🎲 2d6+3 = 9 (4, 2)'
    );
  });
});

describe('parseRoll', () => {
  it('recupera la tirada del JSON y rechaza basura', () => {
    const roll = rollDice(2, 10, 1, seq(0.5));
    expect(parseRoll(JSON.stringify(roll))).toEqual(roll);
    expect(parseRoll(null)).toBeNull();
    expect(parseRoll('no json')).toBeNull();
    expect(parseRoll('{"sides":"veinte"}')).toBeNull();
    expect(parseRoll('{"sides":20,"total":5,"rolls":[5,"x"]}')).toBeNull();
  });
});
