// Vista de hoja de personaje según el handoff «Hojas de Personaje Rolder»:
// héroe con gradiente + secciones tipadas (pills, stats, puntos, contadores,
// listas, tablas, tarjetas, chips, notas) con el acento del sistema, badge
// homebrew en valores fuera de catálogo, y barra de dados rápidos 🎲.

import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RolderFonts } from '@/constants/theme';
import { characterAgeLabel } from '@/lib/characters';
import { GENDER_LABELS, type Gender } from '@/lib/profile';
import {
  isHomebrew,
  sectionsForSystem,
  themeForCharacter,
  type SheetSection,
} from '@/lib/sheet-schema';

type SheetCharacter = {
  name: string;
  archetype: string | null;
  level: string | null;
  gender: string | null;
  age: string | null;
  concept: string | null;
  backstory: string | null;
  status: string;
  traits: Record<string, string>;
  sheet_theme: string | null;
  systems: { name: string; slug: string } | null;
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  playing: { label: 'EN JUEGO', color: '#AAB4FF', bg: 'rgba(88,101,242,0.22)' },
  looking: { label: 'BUSCANDO MESA', color: '#7FF2AC', bg: 'rgba(59,209,111,0.2)' },
  retired: { label: 'RETIRADA', color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.1)' },
};

/** "4/9" → [4, 9]; "3" → [3, max] */
function parseTrack(value: string | undefined, fallbackMax: number): [number, number] {
  if (!value) return [0, fallbackMax];
  const [a, b] = value.split('/').map((x) => Number.parseInt(x.trim(), 10));
  if (Number.isInteger(a) && Number.isInteger(b)) return [Math.min(a, b), b];
  if (Number.isInteger(a)) return [Math.min(a, fallbackMax), fallbackMax];
  return [0, fallbackMax];
}

function splitLine(line: string): string[] {
  return line.split('·').map((p) => p.trim()).filter(Boolean);
}

const DICE = ['d20', 'd100', 'd12', 'd10', '2d6'];

export function CharacterSheetView({ character }: { character: SheetCharacter }) {
  const theme = themeForCharacter(character.sheet_theme, character.systems?.slug);
  const sections = sectionsForSystem(character.systems?.slug);
  const traits = character.traits ?? {};
  const [roll, setRoll] = useState('');

  const heroMeta = [
    character.archetype,
    character.level && `Nivel ${character.level}`,
    character.gender && GENDER_LABELS[character.gender as Gender],
    characterAgeLabel(character.age),
    character.systems?.name,
  ]
    .filter(Boolean)
    .join(' · ');
  const badge = STATUS_BADGE[character.status] ?? STATUS_BADGE.looking;

  const lines = (key: string) =>
    (traits[key] ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

  const renderSection = (section: SheetSection, index: number) => {
    const title = 'title' in section ? section.title : undefined;
    const header = title ? (
      <Text style={[styles.sectionTitle, { color: theme.accent }]}>{title}</Text>
    ) : null;

    switch (section.kind) {
      case 'fields': {
        const filled = section.fields.filter((f) => (traits[f.key] ?? '').trim());
        if (filled.length === 0) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            <View style={styles.pillRow}>
              {filled.map((f) => (
                <View key={f.key} style={styles.pill}>
                  <Text style={styles.pillLabel}>
                    {f.label} <Text style={styles.pillValue}>{traits[f.key]}</Text>
                    {isHomebrew(f, traits[f.key]) && (
                      <Text style={[styles.homebrew, { color: theme.accent }]}> ⌂ homebrew</Text>
                    )}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      }
      case 'stats': {
        const filled = section.fields.filter((f) => (traits[f.key] ?? '').trim());
        if (filled.length === 0) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            <View style={styles.statGrid}>
              {filled.map((f) => (
                <View key={f.key} style={[styles.statCell, { width: `${100 / section.cols - 1.5}%` }]}>
                  <Text style={styles.statLabel}>{f.label}</Text>
                  <Text style={styles.statBig}>{traits[f.key]}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      }
      case 'dots': {
        const max = section.max ?? 5;
        const filled = section.fields.filter((f) => (traits[f.key] ?? '').trim());
        if (filled.length === 0) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            <View style={styles.box}>
              {filled.map((f) => {
                const n = Math.max(0, Math.min(max, Number.parseInt(traits[f.key], 10) || 0));
                return (
                  <View key={f.key} style={styles.dotRow}>
                    <Text style={styles.dotLabel}>{f.label}</Text>
                    <Text style={[styles.dotDots, { color: theme.accent }]}>
                      {'●'.repeat(n)}
                      {'○'.repeat(max - n)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      }
      case 'track': {
        const filled = section.fields.filter((f) => (traits[f.key] ?? '').trim());
        if (filled.length === 0) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            <View style={styles.box}>
              {filled.map((f) => {
                const [val, max] = parseTrack(traits[f.key], 5);
                return (
                  <View key={f.key} style={styles.dotRow}>
                    <Text style={styles.dotLabel}>{f.label}</Text>
                    <View style={styles.trackCells}>
                      {Array.from({ length: Math.min(max, 15) }, (_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.trackCell,
                            { borderColor: i < val ? theme.accent : 'rgba(255,255,255,0.22)' },
                            i < val && { backgroundColor: theme.accent },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.trackVal}>{traits[f.key]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      }
      case 'list': {
        const rows = lines(section.key);
        if (rows.length === 0) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            <View style={styles.box}>
              {rows.map((line, i) => {
                const [name, val, tag] = splitLine(line);
                return (
                  <View key={i} style={[styles.listRow, i > 0 && styles.listDivider]}>
                    <Text style={styles.listName}>{name}</Text>
                    {tag && (
                      <Text style={[styles.listBadge, { color: theme.accent }]}>{tag}</Text>
                    )}
                    <Text style={styles.listVal}>{val ?? ''}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      }
      case 'table': {
        const rows = lines(section.key);
        if (rows.length === 0) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            <View style={styles.box}>
              <View style={styles.tableRow}>
                {section.headers.map((h) => (
                  <Text key={h} style={[styles.tableHead, styles.tableCol]}>
                    {h}
                  </Text>
                ))}
              </View>
              {rows.map((line, i) => {
                const [a, b, c] = splitLine(line);
                return (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableA, styles.tableCol]}>{a}</Text>
                    <Text style={[styles.tableB, styles.tableCol, { color: theme.accent }]}>
                      {b ?? ''}
                    </Text>
                    <Text style={[styles.tableC, styles.tableCol]}>{c ?? ''}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      }
      case 'cards': {
        const rows = lines(section.key);
        if (rows.length === 0) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            {rows.map((line, i) => {
              const [cardTitle, body] = line.split('::').map((p) => p.trim());
              return (
                <View key={i} style={styles.card}>
                  <Text style={styles.cardTitle}>{cardTitle}</Text>
                  {body && <Text style={styles.cardBody}>{body}</Text>}
                </View>
              );
            })}
          </View>
        );
      }
      case 'chips': {
        const items = (traits[section.key] ?? '')
          .split(/[,\n]/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (items.length === 0) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            <View style={styles.pillRow}>
              {items.map((item, i) => (
                <View key={i} style={styles.pill}>
                  <Text style={styles.pillValue}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      }
      case 'text': {
        const value = (traits[section.key] ?? '').trim();
        if (!value) return null;
        return (
          <View key={index} style={styles.block}>
            {header}
            <View style={styles.note}>
              <Text style={styles.noteText}>{value}</Text>
            </View>
          </View>
        );
      }
    }
  };

  return (
    <View style={[styles.sheet, { borderColor: theme.border }]}>
      {/* héroe */}
      <View style={styles.hero}>
        <LinearGradient
          colors={theme.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroEmblem}>
          <Text style={styles.heroEmoji}>{theme.emblem}</Text>
        </LinearGradient>
        <View style={styles.heroBody}>
          <Text style={styles.heroName} numberOfLines={1}>
            {character.name}
          </Text>
          <Text style={styles.heroMeta} numberOfLines={2}>
            {heroMeta}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusLabel, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {character.concept && <Text style={styles.concept}>«{character.concept}»</Text>}

      {sections.map(renderSection)}

      {character.backstory && (
        <View style={styles.block}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>Trasfondo</Text>
          <View style={styles.note}>
            <Text style={styles.noteText}>{character.backstory}</Text>
          </View>
        </View>
      )}

      {/* dados rápidos */}
      <View style={styles.rollBar}>
        <Text style={styles.rollDie}>🎲</Text>
        {DICE.map((die) => (
          <Pressable
            key={die}
            style={styles.rollChip}
            onPress={() => {
              const [nStr, sides] = die.split('d');
              const n = nStr ? Number.parseInt(nStr, 10) : 1;
              let sum = 0;
              for (let i = 0; i < n; i++) sum += 1 + Math.floor(Math.random() * Number(sides));
              setRoll(`${die} → ${sum}`);
            }}>
            <Text style={styles.rollChipLabel}>{die}</Text>
          </Pressable>
        ))}
        {roll !== '' && (
          <Text style={[styles.rollResult, { color: theme.accent }]}>{roll}</Text>
        )}
      </View>
    </View>
  );
}

const SURFACE = '#1B1B26';
const BORDER = 'rgba(255,255,255,0.08)';

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#101018',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 13,
  },
  heroEmblem: {
    width: 62,
    height: 62,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 30,
  },
  heroBody: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    color: '#fff',
    fontSize: 16.5,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: RolderFonts.regular,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 9.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  concept: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: RolderFonts.regular,
    fontStyle: 'italic',
  },
  block: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  pill: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11.5,
    fontFamily: RolderFonts.regular,
  },
  pillValue: {
    color: '#fff',
    fontSize: 11.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  homebrew: {
    fontSize: 9.5,
    fontFamily: RolderFonts.bold,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  statCell: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: 2,
    flexGrow: 1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statBig: {
    color: '#fff',
    fontSize: 17,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  box: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 8,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    width: 104,
  },
  dotDots: {
    fontSize: 11,
    letterSpacing: 2,
  },
  trackCells: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  trackCell: {
    width: 15,
    height: 15,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  trackVal: {
    color: '#fff',
    fontSize: 12,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  listDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  listName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
    flex: 1,
  },
  listBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 9,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  listVal: {
    color: '#fff',
    fontSize: 13,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 3,
  },
  tableCol: {
    flex: 1,
  },
  tableHead: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  tableA: {
    color: '#fff',
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  tableB: {
    fontSize: 12,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  tableC: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: RolderFonts.regular,
  },
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 3,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 12.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  cardBody: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11.5,
    lineHeight: 17,
    fontFamily: RolderFonts.regular,
  },
  note: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  noteText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: RolderFonts.regular,
  },
  rollBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    flexWrap: 'wrap',
  },
  rollDie: {
    fontSize: 15,
  },
  rollChip: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  rollChipLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  rollResult: {
    marginLeft: 'auto',
    fontSize: 13,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
});
