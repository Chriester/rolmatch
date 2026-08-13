import { levelFromXp, levelInfoFromXp, titleForLevel, xpForLevel } from '@/lib/xp';

describe('xpForLevel', () => {
  it('el nivel 1 es gratis y la curva crece cuadrática', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(4)).toBe(600);
    expect(xpForLevel(5)).toBe(1000);
  });

  it('a partir del nivel 8 el coste por nivel se congela en 800', () => {
    expect(xpForLevel(8)).toBe(2800);
    expect(xpForLevel(9)).toBe(3600);
    expect(xpForLevel(10)).toBe(4400);
    expect(xpForLevel(20)).toBe(12400);
    // sin el tope, el 20 costaría 50·20·19 = 19000
    expect(xpForLevel(20)).toBeLessThan(19000);
  });
});

describe('levelFromXp', () => {
  it('0 XP (o negativo defensivo) es nivel 1', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-50)).toBe(1);
  });

  it('sube justo en el umbral, no antes', () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
  });

  it('es la inversa de xpForLevel en todos los niveles razonables', () => {
    for (let level = 1; level <= 60; level++) {
      const floor = xpForLevel(level);
      expect(levelFromXp(floor)).toBe(level);
      if (level > 1) expect(levelFromXp(floor - 1)).toBe(level - 1);
    }
  });
});

describe('titleForLevel', () => {
  it('asigna el tramo correcto', () => {
    expect(titleForLevel(1)).toBe('Dado prestado');
    expect(titleForLevel(2)).toBe('Dado prestado');
    expect(titleForLevel(3)).toBe('Alma de taberna');
    expect(titleForLevel(8)).toBe('Acero templado');
    expect(titleForLevel(11)).toBe('Rompehechizos');
    expect(titleForLevel(15)).toBe('Estandarte de la mesa');
    expect(titleForLevel(19)).toBe('Eco de leyenda');
    expect(titleForLevel(20)).toBe('Mito viviente');
    expect(titleForLevel(24)).toBe('Susurro de los dioses');
    expect(titleForLevel(45)).toBe('Dado de oro');
  });

  it('el siguiente título nunca queda a más de 4 niveles', () => {
    const milestones = [1, 3, 5, 8, 10, 12, 14, 16, 18, 20, 23, 26, 30];
    for (let i = 1; i < milestones.length; i++) {
      expect(milestones[i] - milestones[i - 1]).toBeLessThanOrEqual(4);
    }
  });
});

describe('levelInfoFromXp', () => {
  it('calcula progreso dentro del nivel', () => {
    const info = levelInfoFromXp(150); // nivel 2 va de 100 a 300
    expect(info.level).toBe(2);
    expect(info.levelFloor).toBe(100);
    expect(info.nextLevelAt).toBe(300);
    expect(info.progress).toBeCloseTo(0.25);
    expect(info.title).toBe('Dado prestado');
  });

  it('el progreso nunca pasa de 1', () => {
    expect(levelInfoFromXp(0).progress).toBe(0);
    expect(levelInfoFromXp(99).progress).toBeLessThan(1);
  });
});
