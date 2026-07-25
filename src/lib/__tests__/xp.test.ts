import { levelFromXp, levelInfoFromXp, titleForLevel, xpForLevel } from '@/lib/xp';

describe('xpForLevel', () => {
  it('el nivel 1 es gratis y la curva crece cuadrática', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(4)).toBe(600);
    expect(xpForLevel(5)).toBe(1000);
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
    expect(titleForLevel(19)).toBe('Leyenda local');
    expect(titleForLevel(20)).toBe('Mito viviente');
    expect(titleForLevel(45)).toBe('Mito viviente');
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
