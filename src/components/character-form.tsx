// Asistente de creación/edición de personaje en 3 pasos:
// ① quién es → ② mini-hoja del sistema elegido (campos dinámicos por
// esquema + diseño visual de hoja) → ③ historia y estado.
// Sirve para crear y editar (misma pieza, precargada con `initial`).

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { OutlineButton, PrimaryButton, SectionLabel } from '@/components/ui';
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

const STEP_TITLES = ['Quién es', 'Su hoja', 'Su historia'];

type CharacterFormProps = {
  userId: string;
  initial?: CharacterInput;
  busy: boolean;
  submitLabel: string;
  onSubmit: (input: CharacterInput) => void;
  /** estado de desbloqueo de diseños (premium / nivel de cuenta) */
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
  const [step, setStep] = useState(0);
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

  useEffect(() => {
    fetchSystems().then(setSystems).catch(() => {});
  }, []);

  const systemSlug = systems.find((s) => s.id === systemId)?.slug ?? null;
  const sections = sectionsForSystem(systemSlug);
  const activeTheme = themeForCharacter(sheetTheme, systemSlug);
  const [homebrewMode, setHomebrewMode] = useState(false);

  const setTrait = (key: string, value: string) =>
    setTraits((prev) => ({ ...prev, [key]: value }));

  const stepValid = step !== 0 || name.trim().length > 0;

  const handleSubmit = () => {
    // solo persistimos claves del esquema activo, limpias
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
        <ThemedText type="small">
          {field.label}
          {isHomebrew(field, value) ? '  ·  ⌂ homebrew' : ''}
        </ThemedText>
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
                placeholderTextColor="rgba(255,255,255,0.35)"
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
            placeholderTextColor="rgba(255,255,255,0.35)"
            maxLength={140}
          />
        )}
      </View>
    );
  };

  const renderEditorSection = (section: SheetSection, index: number) => {
    const title = 'title' in section ? section.title : undefined;
    const header = title ? <SectionLabel key={`t-${index}`}>{title}</SectionLabel> : null;

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
        section.kind === 'dots' ? `0-${section.max ?? 5}` : section.kind === 'track' ? '4/9' : '';
      return (
        <View key={index} style={styles.sectionBlock}>
          {header}
          <View style={styles.compactGrid}>
            {section.fields.map((field) => (
              <View key={field.key} style={styles.compactCell}>
                <ThemedText type="small">{field.label}</ThemedText>
                <TextInput
                  style={styles.input}
                  value={traits[field.key] ?? ''}
                  onChangeText={(v) => setTrait(field.key, v)}
                  placeholder={field.placeholder ?? hint}
                  placeholderTextColor="rgba(255,255,255,0.35)"
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
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
          />
        </View>
      );
    }
    // list / table / cards / chips: una entrada por línea con separadores
    const helper =
      section.kind === 'chips'
        ? 'Separadas por comas'
        : section.kind === 'cards'
          ? 'Una por línea · «Título :: descripción»'
          : 'Una por línea · partes separadas con «·»';
    return (
      <View key={index} style={styles.sectionBlock}>
        {header}
        <TextInput
          style={[styles.input, styles.multiline]}
          value={traits[section.key] ?? ''}
          onChangeText={(v) => setTrait(section.key, v)}
          placeholder={section.hint}
          placeholderTextColor="rgba(255,255,255,0.35)"
          multiline
        />
        <ThemedText type="small">{helper}</ThemedText>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.stepHeader}>
        <ThemedText type="subtitle">{STEP_TITLES[step]}</ThemedText>
        <ThemedText type="small">Paso {step + 1} de 3</ThemedText>
      </View>
      <View style={styles.progressRow}>
        {STEP_TITLES.map((_, i) => (
          <View key={i} style={[styles.progressSegment, i <= step && styles.progressDone]} />
        ))}
      </View>

      {step === 0 && (
        <View style={styles.section}>
          <PhotoPicker
            userId={userId}
            prefix="character"
            url={portraitUrl}
            onPicked={setPortraitUrl}
            label="Retrato"
          />

          <SectionLabel>Nombre *</SectionLabel>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Karlach la Incandescente"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />

          <SectionLabel>Sistema de juego</SectionLabel>
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

          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <SectionLabel>Género (opcional)</SectionLabel>
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
            </View>
            <View style={styles.column}>
              <SectionLabel>Edad (opcional)</SectionLabel>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="234, joven eterno…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                maxLength={20}
              />
            </View>
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={styles.section}>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <SectionLabel>Clase / arquetipo</SectionLabel>
              <TextInput
                style={styles.input}
                value={archetype}
                onChangeText={setArchetype}
                placeholder="Bárbara"
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
            </View>
            <View style={styles.column}>
              <SectionLabel>Nivel</SectionLabel>
              <TextInput
                style={styles.input}
                value={level}
                onChangeText={setLevel}
                placeholder="5"
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
            </View>
          </View>

          <View style={styles.homebrewRow}>
            <View style={styles.homebrewLabel}>
              <ThemedText>⌂ Modo homebrew</ThemedText>
              <ThemedText type="small">
                Escribe lo que quieras en los campos con opciones; se marcará como homebrew
              </ThemedText>
            </View>
            <Switch value={homebrewMode} onValueChange={setHomebrewMode} />
          </View>

          {sections.map((section, index) => renderEditorSection(section, index))}

          <SectionLabel>Diseño de la hoja</SectionLabel>
          <View style={styles.themeRow}>
            {SHEET_THEMES.map((theme) => {
              const locked = !canUseTheme(theme, themeStatus);
              const selected = activeTheme.id === theme.id;
              return (
                <Pressable
                  key={theme.id}
                  onPress={() => {
                    if (locked) {
                      showAlert(
                        `Diseño «${theme.name}» bloqueado`,
                        theme.unlock === 'premium'
                          ? 'Será parte de rolder premium. De momento, los diseños de sistema son gratis.'
                          : `Se desbloquea al alcanzar el ${unlockLabel(theme)} de cuenta.`
                      );
                      return;
                    }
                    setSheetTheme(theme.id);
                  }}>
                  <LinearGradient
                    colors={theme.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.themeSwatch,
                      { borderColor: selected ? theme.accent : 'rgba(255,255,255,0.15)' },
                      selected && styles.themeSwatchSelected,
                    ]}>
                    <Text style={styles.themeEmblem}>{locked ? '🔒' : theme.emblem}</Text>
                    <Text style={[styles.themeName, { color: theme.accent }]} numberOfLines={1}>
                      {theme.name}
                    </Text>
                    {locked && (
                      <Text style={styles.themeLock} numberOfLines={1}>
                        {unlockLabel(theme)}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.section}>
          <SectionLabel>Concepto (1-2 frases)</SectionLabel>
          <TextInput
            style={styles.input}
            value={concept}
            onChangeText={setConcept}
            placeholder="Fugitiva del infierno con un motor infernal por corazón"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />

          <SectionLabel>Trasfondo breve (opcional)</SectionLabel>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={backstory}
            onChangeText={setBackstory}
            placeholder="Su historia, sus cicatrices, lo que busca…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
          />

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
        </View>
      )}

      <View style={styles.nav}>
        {step > 0 && (
          <OutlineButton
            label="‹ Atrás"
            tone="white"
            onPress={() => setStep(step - 1)}
            disabled={busy}
            style={styles.backButton}
          />
        )}
        {step < 2 ? (
          <PrimaryButton
            label="Siguiente ›"
            onPress={() => setStep(step + 1)}
            disabled={!stepValid || busy}
            style={styles.nextButton}
          />
        ) : (
          <PrimaryButton
            label={busy ? 'Guardando…' : submitLabel}
            onPress={handleSubmit}
            disabled={name.trim().length === 0 || busy}
            style={styles.nextButton}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressDone: {
    backgroundColor: Rolder.violet,
  },
  section: {
    gap: Spacing.three,
  },
  input: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.regular,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  column: {
    flex: 1,
    gap: Spacing.two,
  },
  fieldBlock: {
    gap: Spacing.one,
  },
  sectionBlock: {
    gap: Spacing.two,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  compactCell: {
    width: '47%',
    flexGrow: 1,
    gap: 2,
  },
  homebrewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    backgroundColor: 'rgba(139,108,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139,108,255,0.3)',
    borderRadius: 14,
    padding: 12,
  },
  homebrewLabel: {
    flex: 1,
    gap: 2,
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  themeSwatch: {
    width: 96,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 3,
  },
  themeSwatchSelected: {
    transform: [{ scale: 1.04 }],
  },
  themeEmblem: {
    fontSize: 22,
  },
  themeName: {
    fontSize: 11,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  themeLock: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9.5,
    fontFamily: RolderFonts.semibold,
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
  nav: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.two,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
