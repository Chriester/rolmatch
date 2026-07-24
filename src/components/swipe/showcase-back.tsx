// Dorso de la tarjeta de un jugador: su vitrina pública de personajes.

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ShowcaseCharacter } from '@/lib/feed';

type ShowcaseBackProps = {
  alias: string;
  characters: ShowcaseCharacter[];
};

export function ShowcaseBack({ alias, characters }: ShowcaseBackProps) {
  return (
    <LinearGradient colors={['#2A2D43', '#16171f']} style={styles.card}>
      <Text style={styles.title}>Vitrina de {alias}</Text>
      {characters.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>🎭</Text>
          <Text style={styles.emptyText}>Sin personajes públicos todavía.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {characters.map((c) => (
            <View key={c.id} style={styles.row}>
              {c.portrait_url ? (
                <Image source={{ uri: c.portrait_url }} style={styles.portrait} />
              ) : (
                <View style={[styles.portrait, styles.portraitFallback]}>
                  <Text style={styles.portraitEmoji}>🧝</Text>
                </View>
              )}
              <View style={styles.rowBody}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.meta}>
                  {[c.archetype, c.systems?.name, c.level && `nivel ${c.level}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {c.concept && (
                  <Text style={styles.concept} numberOfLines={2}>
                    {c.concept}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <Text style={styles.hint}>Toca para volver</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  list: {
    gap: 14,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  portrait: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  portraitFallback: {
    backgroundColor: 'rgba(88,101,242,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitEmoji: {
    fontSize: 26,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  concept: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
  },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textAlign: 'center',
  },
});
