// Corazón con contador en la cara de un personaje: valoración positiva
// independiente por personaje (tabla character_likes).

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { fetchCharacterLikeState, setCharacterLike } from '@/lib/characters';

type CharacterLikeButtonProps = {
  characterId: string;
  viewerId: string;
};

export function CharacterLikeButton({ characterId, viewerId }: CharacterLikeButtonProps) {
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCharacterLikeState(characterId, viewerId)
      .then((state) => {
        if (cancelled) return;
        setCount(state.count);
        setLiked(state.liked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [characterId, viewerId]);

  const toggle = async () => {
    if (busy || count === null) return;
    setBusy(true);
    const next = !liked;
    // Optimista: revertimos si falla
    setLiked(next);
    setCount((c) => (c ?? 0) + (next ? 1 : -1));
    try {
      await setCharacterLike(characterId, viewerId, next);
    } catch {
      setLiked(!next);
      setCount((c) => (c ?? 0) + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      style={[styles.pill, liked && styles.pillLiked]}
      onPress={toggle}
      accessibilityLabel="Me gusta este personaje">
      <Text style={[styles.glyph, liked && styles.glyphLiked]}>♥</Text>
      <Text style={styles.count}>{count ?? '·'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pillLiked: {
    borderColor: '#3FBF8F',
  },
  glyph: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '700',
  },
  glyphLiked: {
    color: '#3FBF8F',
  },
  count: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
