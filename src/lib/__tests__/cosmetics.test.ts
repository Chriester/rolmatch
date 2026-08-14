import { AVATAR_FLAIRS, CARD_FRAMES, flairFor, frameFor, isCosmeticUnlocked } from '@/lib/cosmetics';

describe('isCosmeticUnlocked', () => {
  it('free siempre; por nivel, justo en el umbral', () => {
    expect(isCosmeticUnlocked('free', 1)).toBe(true);
    expect(isCosmeticUnlocked({ level: 4 }, 3)).toBe(false);
    expect(isCosmeticUnlocked({ level: 4 }, 4)).toBe(true);
  });
});

describe('frameFor / flairFor (anti-trampas en el render)', () => {
  it('null sin elección o con id desconocido', () => {
    expect(frameFor(null, 20)).toBeNull();
    expect(frameFor('inventado', 20)).toBeNull();
    expect(flairFor(undefined, 20)).toBeNull();
  });

  it('no pinta un cosmético equipado sin nivel suficiente', () => {
    expect(frameFor('bronce', 3)).toBeNull();
    expect(frameFor('bronce', 4)?.id).toBe('bronce');
    expect(flairFor('corona', 11)).toBeNull();
    expect(flairFor('corona', 12)?.emoji).toBe('👑');
  });

  it('los ids del catálogo son únicos', () => {
    expect(new Set(CARD_FRAMES.map((f) => f.id)).size).toBe(CARD_FRAMES.length);
    expect(new Set(AVATAR_FLAIRS.map((f) => f.id)).size).toBe(AVATAR_FLAIRS.length);
  });
});
