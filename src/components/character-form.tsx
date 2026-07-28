// Creación/edición de personaje SIN asistente: eliges sistema y se genera
// la hoja vacía con su diseño; se rellena directamente sobre la hoja
// (desplegables por chips, modo homebrew, entradas con el estilo del tema).

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton, SectionLabel } from '@/components/ui';
import { Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { showAlert } from '@/lib/alert';
import {
  CHARACTER_STATUS_LABELS,
  type CharacterInput,
  type CharacterStatus,
} from '@/lib/characters';
import { GENDER_LABELS, fetchSystems, type Gender, type System } from '@/lib/profile';
import {
  SHEET_THEMES,
  canUseTheme,
  isHomebrew,
  sectionsForSystem,
  themeForCharacter,
  unlockLabel,
  type SheetField,
  type SheetSection,
} from '@/lib/sheet-schema';

type CharacterFormProps = {
  userId: string;
  initial?: CharacterInput;
  busy: boolean;
  submitLabel: string;
  onSubmit: (input: CharacterInput) => void;
  themeStatus?: { isPremium: boolean; level: number };
};

export function CharacterForm({
  userId,
  initial,
  busy,
  submitLabel,
  onSubmit,
  themeStatus = { isPremium: false, level: 1 },
}: CharacterFormProps) {
  const [systems, setSystems] = useState<System[]>([]);
  const [name, setName] = useState(initial?.name ?? '');
  const [portraitUrl, setPortraitUrl] = useState<string | null>(initial?.portrait_url ?? null);
  const [systemId, setSystemId] = useState<number | null>(initial?.system_id ?? null);
  const [archetype, setArchetype] = useState(initial?.archetype ?? '');
  const [level, setLevel] = useState(initial?.level ?? '');
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null);
  const [age, setAge] = useState(initial?.age ?? '');
  const [concept, setConcept] = useState(initial?.concept ?? '');
  const [backstory, setBackstory] = useState(initial?.backstory ?? '');
  const [status, setStatus] = useState<CharacterStatus>(initial?.status ?? 'looking');
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [traits, setTraits] = useState<Record<string, string>>(initial?.traits ?? {});
  const [sheetTheme, setSheetTheme] = useState<string | null>(initial?.sheet_theme ?? null);
  const [homebrewMode, setHomebrewMode] = useState(false);

  useEffect(() => {
    fetchSystems().then(setSystems).catch(() => {});
  }, []);

  const systemSlug = systems.find((s) => s.id === systemId)?.slug ?? null;
  const sections = sectionsForSystem(systemSlug);
  const theme = themeForCharacter(sheetTheme, systemSlug);

  const setTrait = (key: string, value: string) =>
    setTraits((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const keys: string[] = [];
    for (const section of sections) {
      if ('fields' in section) keys.push(...section.fields.map((f) => f.key));
      else keys.push(section.key);
    }
    const cleanTraits: Record<string, string> = {};
    for (const key of keys) {
      const value = (traits[key] ?? '').trim();
      if (value) cleanTraits[key] = value;
    }
    onSubmit({
      name: name.trim(),
      is_public: isPublic,
      portrait_url: portraitUrl,
      system_id: systemId,
      archetype: archetype.trim() || null,
      level: level.trim() || null,
      gender,
      age: age.trim() || null,
      concept: concept.trim() || null,
      backstory: backstory.trim() || null,
      status,
      traits: cleanTraits,
      sheet_theme: sheetTheme,
    });
  };

  const renderOptionField = (field: SheetField) => {
    const value = traits[field.key] ?? '';
    const homebrewValue = field.options && !field.options.includes(value) ? value : '';
    return (
      <View key={field.key} style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: theme.accent }]}>
          {field.label}
          {isHomebrew(field, value) ? '  ⌂' : ''}
        </Text>
        {field.options ? (
          <>
            <View style={styles.chipRow}>
              {field.options.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={value === option}
                  onPress={() => setTrait(field.key, value === option ? '' : option)}
                />
              ))}
            </View>
            {(homebrewMode || homebrewValue !== '') && (
              <TextInput
                style={styles.input}
                value={homebrewValue}
                onChangeText={(v) => setTrait(field.key, v)}
                placeholder="⌂ O escribe tu versión homebrew…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={60}
              />
            )}
          </>
        ) : (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(v) => setTrait(field.key, v)}
            placeholder={field.placeholder}
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={140}
          />
        )}
      </View>
    );
  };

  const renderSection = (section: SheetSection, index: number) => {
    const title = 'title' in section ? section.title : undefined;
    const header = title ? (
      <Text style={[styles.sectionTitle, { color: theme.accent }]}>{title}</Text>
    ) : null;

    if (section.kind === 'fields') {
      return (
        <View key={index} style={styles.sectionBlock}>
          {header}
          {section.fields.map(renderOptionField)}
        </View>
      );
    }
    if (section.kind === 'stats' || section.kind === 'dots' || section.kind === 'track') {
      const hint =
        section.kind === 'dots' ? `0-${section.max ?? 5}` : section.kind === 'track' ? '4/9' : '—';
      return (
        <View key={index} style={styles.sectionBlock}>
          {header}
          <View style={styles.compactGrid}>
            {section.fields.map((field) => (
              <View key={field.key} style={styles.compactCell}>
                <Text style={styles.compactLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.input, styles.compactInput]}
                  value={traits[field.key] ?? ''}
                  onChangeText={(v) => setTrait(field.key, v)}
                  placeholder={field.placeholder ?? hint}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  maxLength={12}
                />
              </View>
            ))}
          </View>
        </View>
      );
    }
    if (section.kind === 'text') {
      return (
        <View key={index} style={styles.sectionBlock}>
          {header}
          <TextInput
            style={[styles.input, styles.multiline]}
            value={traits[section.key] ?? ''}
            onChangeText={(v) => setTrait(section.key, v)}
            placeholder={section.placeholder}
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
          />
        </View>
      );
    }
    const helper =
      section.kind === 'chips'
        ? 'separadas por comas'
        : section.kind === 'cards'
          ? 'una por línea · «Título :: descripción»'
          : 'una por línea · partes con «·»';
    return (
      <View key={index} style={styles.sectionBlock}>
        {header}
        <TextInput
          style={[styles.input, styles.multiline]}
          value={traits[section.key] ?? ''}
          onChangeText={(v) => setTrait(section.key, v)}
          placeholder={`${section.hint}\n(${helper})`}
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
        />
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* básicos compactos */}
      <View style={styles.basicsRow}>
        <PhotoPicker
          userId={userId}
          prefix="character"
          url={portraitUrl}
          onPicked={setPortraitUrl}
          label="Retrato"
        />
      </View>
      <TextInput
        style={[styles.input, styles.nameInput]}
        value={name}
        onChangeText={setName}
        placeholder="Nombre del personaje *"
        placeholderTextColor="rgba(255,255,255,0.35)"
      />

      <SectionLabel>Sistema — genera su hoja</SectionLabel>
      <View style={styles.chipRow}>
        {systems.map((system) => (
          <Chip
            key={system.id}
            label={system.name}
            selected={systemId === system.id}
            onPress={() => setSystemId(systemId === system.id ? null : system.id)}
          />
        ))}
      </View>

      {systemId === null ? (
        <Text style={styles.hint}>
          🎲 Elige un sistema y su hoja aparecerá aquí, lista para rellenar.
        </Text>
      ) : (
        <>
          {/* diseño + homebrew */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.themeRow}>
              {SHEET_THEMES.map((t) => {
                const locked = !canUseTheme(t, themeStatus);
                const selected = theme.id === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      if (locked) {
                        showAlert(
                          `Diseño «${t.name}» bloqueado`,
                          t.unlock === 'premium'
                            ? 'Será parte de rolder premium.'
                            : `Se desbloquea al alcanzar el ${unlockLabel(t)} de cuenta.`
                        );
                        return;
                      }
                      setSheetTheme(t.id);
                    }}>
                    <LinearGradient
                      colors={t.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.themeSwatch,
                        { borderColor: selected ? t.accent : 'rgba(255,255,255,0.15)' },
                      ]}>
                      <Text style={styles.themeEmblem}>{locked ? '🔒' : t.emblem}</Text>
                      <Text style={[styles.themeName, { color: t.accent }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.homebrewRow}>
            <ThemedText type="small" style={styles.homebrewText}>
              ⌂ Homebrew: texto libre en los desplegables (marcado en la hoja)
            </ThemedText>
            <Switch value={homebrewMode} onValueChange={setHomebrewMode} />
          </View>

          {/* LA HOJA editable */}
          <View style={[styles.sheet, { borderColor: theme.border }]}>
            <View style={styles.hero}>
              <LinearGradient
                colors={theme.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroEmblem}>
                <Text style={styles.heroEmoji}>{theme.emblem}</Text>
              </LinearGradient>
              <View style={styles.heroInputs}>
                <TextInput
                  style={[styles.input, styles.heroInput]}
                  value={archetype}
                  onChangeText={setArchetype}
                  placeholder="Clase / arquetipo"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
                <View style={styles.heroSmallRow}>
                  <TextInput
                    style={[styles.input, styles.heroSmall]}
                    value={level}
                    onChangeText={setLevel}
                    placeholder="Nivel"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  <TextInput
                    style={[styles.input, styles.heroSmall]}
                    value={age}
                    onChangeText={setAge}
                    placeholder="Edad"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    maxLength={20}
                  />
                </View>
              </View>
            </View>
            <View style={styles.chipRow}>
              {(Object.keys(GENDER_LABELS) as Gender[]).map((value) => (
                <Chip
                  key={value}
                  label={GENDER_LABELS[value]}
                  selected={gender === value}
                  onPress={() => setGender(gender === value ? null : value)}
                />
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.conceptInput]}
              value={concept}
              onChangeText={setConcept}
              placeholder="«Concepto en una frase»"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            {sections.map(renderSection)}

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: theme.accent }]}>Trasfondo</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={backstory}
                onChangeText={setBackstory}
                placeholder="Su historia, sus cicatrices, lo que busca…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
              />
            </View>
          </View>
        </>
      )}

      <SectionLabel>Estado</SectionLabel>
      <View style={styles.chipRow}>
        {(Object.keys(CHARACTER_STATUS_LABELS) as CharacterStatus[]).map((value) => (
          <Chip
            key={value}
            label={CHARACTER_STATUS_LABELS[value]}
            selected={status === value}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <ThemedText>Personaje público</ThemedText>
          <ThemedText type="small">
            Los públicos aparecen en tu vitrina cuando los GMs te ven como candidato
          </ThemedText>
        </View>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>

      <PrimaryButton
        label={busy ? 'Guardando…' : submitLabel}
        onPress={handleSubmit}
        disabled={name.trim().length === 0 || busy}
      />
    </ScrollView>
  );
}

const SHEET_BG = '#101018';

const styles = StyleSheet.create({
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  basicsRow: {
    alignItems: 'center',
  },
  nameInput: {
    fontSize: 17,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  hint: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  input: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  themeSwatch: {
    width: 84,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  themeEmblem: {
    fontSize: 20,
  },
  themeName: {
    fontSize: 10.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  homebrewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: 'rgba(139,108,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  homebrewText: {
    flex: 1,
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: Spacing.three,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  heroInputs: {
    flex: 1,
    gap: 6,
  },
  heroInput: {
    paddingVertical: 8,
  },
  heroSmallRow: {
    flexDirection: 'row',
    gap: 6,
  },
  heroSmall: {
    flex: 1,
    paddingVertical: 8,
  },
  conceptInput: {
    fontStyle: 'italic',
  },
  sectionBlock: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  compactCell: {
    width: '30%',
    flexGrow: 1,
    gap: 3,
  },
  compactLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9.5,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  compactInput: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  switchLabel: {
    flex: 1,
    gap: 2,
  },
});
