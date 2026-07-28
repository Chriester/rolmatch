// Vista de mini-hoja de personaje con el diseño visual (tema) del sistema
// elegido — se usa en la tira de detalles del swipe y donde haga falta
// enseñar la hoja completa.

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { RolderFonts } from '@/constants/theme';
import { GENDER_LABELS, type Gender } from '@/lib/profile';
import { characterAgeLabel } from '@/lib/characters';
import { fieldsForSystem, themeForCharacter } from '@/lib/sheet-schema';

type SheetCharacter = {
  name: string;
  archetype: string | null;
  level: string | null;
  gender: string | null;
  age: string | null;
  concept: string | null;
  backstory: string | null;
  traits: Record<string, string>;
  sheet_theme: string | null;
  systems: { name: string; slug: string } | null;
};

export function CharacterSheetView({ character }: { character: SheetCharacter }) {
  const theme = themeForCharacter(character.sheet_theme, character.systems?.slug);
  const fields = fieldsForSystem(character.systems?.slug);
  const traits = character.traits ?? {};

  const headline = [
    character.archetype,
    character.level && `Nivel ${character.level}`,
    character.gender && GENDER_LABELS[character.gender as Gender],
    characterAgeLabel(character.age),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <LinearGradient
      colors={theme.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.sheet, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={styles.emblem}>{theme.emblem}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.system, { color: theme.accent }]} numberOfLines={1}>
            {character.systems?.name ?? 'Sistema libre'}
          </Text>
          {headline.length > 0 && (
            <Text style={styles.headline} numberOfLines={2}>
              {headline}
            </Text>
          )}
        </View>
      </View>

      {character.concept && <Text style={styles.concept}>«{character.concept}»</Text>}

      {fields
        .filter((field) => (traits[field.key] ?? '').trim().length > 0)
        .map((field) => (
          <View key={field.key} style={styles.row}>
            <Text style={[styles.label, { color: theme.accent }]}>{field.label}</Text>
            <Text style={styles.value}>{traits[field.key]}</Text>
          </View>
        ))}

      {character.backstory && (
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.accent }]}>Trasfondo</Text>
          <Text style={styles.value}>{character.backstory}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emblem: {
    fontSize: 34,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  system: {
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headline: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  concept: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: RolderFonts.regular,
    fontStyle: 'italic',
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: 10.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  value: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: RolderFonts.regular,
  },
});
