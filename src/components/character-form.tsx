// Creación/edición de personaje. Al CREAR hay dos modos: «Ficha rápida»
// (nombre, clase y concepto — lo justo para la vitrina) y «Hoja completa»
// (eliges sistema → aparece LA HOJA del diseño vacía y se rellena tocando,
// CharacterSheetEditor). La hoja siempre puede completarse después desde
// Editar personaje. El selector de diseño cosmético va al final.

import { LinearGradient } from 'expo-linear-gradient';
import { Scroll, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { CharacterSheetEditor } from '@/components/character-sheet-editor';
import { Chip } from '@/components/chip';
import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton, SectionLabel } from '@/components/ui';
import { Rolder, RolderFonts, RolderRadius, Spacing } from '@/constants/theme';
import { showAlert } from '@/lib/alert';
import {
  CHARACTER_STATUS_LABELS,
  type CharacterInput,
  type CharacterStatus,
} from '@/lib/characters';
import { fetchMyGroups, type GroupSummary } from '@/lib/groups';
import { GENDER_LABELS, fetchSystems, type Gender, type System } from '@/lib/profile';
import {
  SHEET_THEMES,
  canUseTheme,
  sectionsForSystem,
  themeForCharacter,
  unlockLabel,
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
  // al crear se arranca en ficha rápida; al editar, siempre hoja completa
  const [mode, setMode] = useState<'quick' | 'full'>(initial ? 'full' : 'quick');
  const [name, setName] = useState(initial?.name ?? '');
  const [portraitUrl, setPortraitUrl] = useState<string | null>(initial?.portrait_url ?? null);
  const [systemId, setSystemId] = useState<number | null>(initial?.system_id ?? null);
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null);
  const [status, setStatus] = useState<CharacterStatus>(initial?.status ?? 'looking');
  const [playingGroupId, setPlayingGroupId] = useState<string | null>(
    initial?.playing_group_id ?? null
  );
  const [myGroups, setMyGroups] = useState<GroupSummary[]>([]);
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [traits, setTraits] = useState<Record<string, string>>(initial?.traits ?? {});
  const [sheetTheme, setSheetTheme] = useState<string | null>(initial?.sheet_theme ?? null);
  const [homebrewMode, setHomebrewMode] = useState(false);
  const [meta, setMetaState] = useState({
    archetype: initial?.archetype ?? '',
    level: initial?.level ?? '',
    age: initial?.age ?? '',
    concept: initial?.concept ?? '',
    backstory: initial?.backstory ?? '',
  });

  useEffect(() => {
    fetchSystems().then(setSystems).catch(() => {});
  }, []);

  useEffect(() => {
    fetchMyGroups(userId)
      .then((groups) => setMyGroups(groups.filter((g) => g.is_active)))
      .catch(() => {});
  }, [userId]);

  const systemSlug = systems.find((s) => s.id === systemId)?.slug ?? null;
  const theme = themeForCharacter(sheetTheme, systemSlug);

  const setTrait = (key: string, value: string) =>
    setTraits((prev) => ({ ...prev, [key]: value }));
  const setMeta = (key: keyof typeof meta, value: string) =>
    setMetaState((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const keys: string[] = [];
    for (const section of sectionsForSystem(systemSlug)) {
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
      archetype: meta.archetype.trim() || null,
      level: meta.level.trim() || null,
      gender,
      age: meta.age.trim() || null,
      concept: meta.concept.trim() || null,
      backstory: meta.backstory.trim() || null,
      status,
      traits: cleanTraits,
      sheet_theme: sheetTheme,
      playing_group_id: status === 'playing' ? playingGroupId : null,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {!initial && (
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeCard, mode === 'quick' && styles.modeCardActive]}
            onPress={() => setMode('quick')}>
            <Zap color={Rolder.violetSoft} size={20} />
            <Text style={styles.modeTitle}>Ficha rápida</Text>
            <Text style={styles.modeDetail}>Nombre, clase y concepto. Listo en un minuto.</Text>
          </Pressable>
          <Pressable
            style={[styles.modeCard, mode === 'full' && styles.modeCardActive]}
            onPress={() => setMode('full')}>
            <Scroll color={Rolder.violetSoft} size={20} />
            <Text style={styles.modeTitle}>Hoja completa</Text>
            <Text style={styles.modeDetail}>La hoja del sistema entera, campo a campo.</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.center}>
        <PhotoPicker
          userId={userId}
          prefix="character"
          url={portraitUrl}
          onPicked={setPortraitUrl}
          label="Retrato"
        />
      </View>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        placeholder="Nombre del personaje *"
        placeholderTextColor="rgba(255,255,255,0.35)"
      />
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

      <SectionLabel>{mode === 'full' ? 'Sistema — genera su hoja' : 'Sistema'}</SectionLabel>
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

      {mode === 'quick' ? (
        <>
          <TextInput
            style={styles.quickInput}
            value={meta.archetype}
            onChangeText={(v) => setMeta('archetype', v)}
            placeholder="Clase o arquetipo (bárbara, cara, investigador…)"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />
          <TextInput
            style={[styles.quickInput, styles.quickMultiline]}
            value={meta.concept}
            onChangeText={(v) => setMeta('concept', v)}
            placeholder="Concepto o descripción en un par de frases…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
          />
          <Text style={styles.hint}>
            Su hoja completa podrás rellenarla cuando quieras desde «Editar personaje».
          </Text>
        </>
      ) : systemId === null ? (
        <Text style={styles.hint}>
          Elige un sistema y su hoja aparecerá aquí, vacía y lista para tocar y rellenar.
        </Text>
      ) : (
        <>
          <View style={styles.homebrewRow}>
            <ThemedText type="small" style={styles.homebrewText}>
              ⌂ Homebrew: escribe lo tuyo en los desplegables (se marca en la hoja)
            </ThemedText>
            <Switch value={homebrewMode} onValueChange={setHomebrewMode} />
          </View>

          <CharacterSheetEditor
            systemSlug={systemSlug}
            theme={theme}
            traits={traits}
            setTrait={setTrait}
            meta={meta}
            setMeta={setMeta}
            homebrew={homebrewMode}
          />

          {/* selector de diseño cosmético, al final del todo */}
          <SectionLabel>Diseño de la hoja</SectionLabel>
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

      {status === 'playing' && myGroups.length > 0 && (
        <>
          <SectionLabel>¿En qué mesa juega?</SectionLabel>
          <ThemedText type="small">
            Vinculado a una mesa, el personaje suma una sesión vivida cada vez que confirmes que
            se jugó.
          </ThemedText>
          <View style={styles.chipRow}>
            <Chip
              label="Ninguna"
              selected={playingGroupId === null}
              onPress={() => setPlayingGroupId(null)}
            />
            {myGroups.map((g) => (
              <Chip
                key={g.id}
                label={g.name}
                selected={playingGroupId === g.id}
                onPress={() => setPlayingGroupId(g.id)}
              />
            ))}
          </View>
        </>
      )}

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

const styles = StyleSheet.create({
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  center: {
    alignItems: 'center',
  },
  nameInput: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: '#fff',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  homebrewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    backgroundColor: 'rgba(199,125,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  homebrewText: {
    flex: 1,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  themeSwatch: {
    width: 84,
    borderWidth: 1.5,
    borderRadius: RolderRadius.md,
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
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: RolderRadius.md,
    padding: 12,
    gap: 3,
  },
  modeCardActive: {
    backgroundColor: 'rgba(199,125,255,0.14)',
    borderColor: 'rgba(199,125,255,0.8)',
  },
  modeTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.bold,
    fontWeight: '700',
  },
  modeDetail: {
    color: Rolder.textSecondary,
    fontSize: 11.5,
    fontFamily: RolderFonts.regular,
    lineHeight: 15,
  },
  quickInput: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: '#fff',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
  },
  quickMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
