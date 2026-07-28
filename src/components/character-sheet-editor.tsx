// Editor WYSIWYG de hoja de personaje: ES la hoja del diseño, vacía, y cada
// campo se rellena tocándolo en el sitio. Desplegables para opciones,
// «+ Añadir» con plantilla para secciones múltiples (ataques, rasgos…).

import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Rolder, RolderFonts } from '@/constants/theme';
import {
  isHomebrew,
  sectionsForSystem,
  type SheetField,
  type SheetSection,
  type SheetTheme,
} from '@/lib/sheet-schema';

type Meta = { archetype: string; level: string; age: string; concept: string; backstory: string };

type Props = {
  systemSlug: string | null;
  theme: SheetTheme;
  traits: Record<string, string>;
  setTrait: (key: string, value: string) => void;
  meta: Meta;
  setMeta: (key: keyof Meta, value: string) => void;
  homebrew: boolean;
};

type ModalState =
  | { kind: 'options'; title: string; field: SheetField }
  | { kind: 'entry'; title: string; sectionKey: string; labels: string[]; sep: ' · ' | ' :: ' }
  | null;

const ph = 'rgba(255,255,255,0.28)';

export function CharacterSheetEditor({
  systemSlug,
  theme,
  traits,
  setTrait,
  meta,
  setMeta,
  homebrew,
}: Props) {
  const sections = sectionsForSystem(systemSlug);
  const [modal, setModal] = useState<ModalState>(null);
  const [draft, setDraft] = useState<string[]>([]);

  const lines = (key: string) =>
    (traits[key] ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  const removeLine = (key: string, index: number) =>
    setTrait(key, lines(key).filter((_, i) => i !== index).join('\n'));

  const accentTitle = (title?: string) =>
    title ? <Text style={[s.title, { color: theme.accent }]}>{title}</Text> : null;

  const renderSection = (section: SheetSection, index: number) => {
    switch (section.kind) {
      case 'fields':
        return (
          <View key={index} style={s.block}>
            {accentTitle(section.title)}
            <View style={s.pillRow}>
              {section.fields.map((f) => {
                const value = traits[f.key] ?? '';
                return (
                  <Pressable
                    key={f.key}
                    style={[s.pill, !value && s.pillEmpty]}
                    onPress={() =>
                      f.options
                        ? setModal({ kind: 'options', title: f.label, field: f })
                        : setModal({
                            kind: 'entry',
                            title: f.label,
                            sectionKey: f.key,
                            labels: [f.placeholder ?? f.label],
                            sep: ' · ',
                          })
                    }>
                    <Text style={s.pillText}>
                      <Text style={s.pillLabel}>{f.label} </Text>
                      <Text style={value ? s.pillValue : s.pillPlaceholder}>
                        {value || 'toca para elegir'}
                      </Text>
                      {isHomebrew(f, value) && (
                        <Text style={[s.hb, { color: theme.accent }]}> ⌂</Text>
                      )}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 'stats':
        return (
          <View key={index} style={s.block}>
            {accentTitle(section.title)}
            <View style={s.grid}>
              {section.fields.map((f) => (
                <View key={f.key} style={[s.statCell, { width: `${100 / section.cols - 1.5}%` }]}>
                  <Text style={s.statLabel}>{f.label}</Text>
                  <TextInput
                    style={s.statInput}
                    value={traits[f.key] ?? ''}
                    onChangeText={(v) => setTrait(f.key, v)}
                    placeholder="—"
                    placeholderTextColor={ph}
                    maxLength={9}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      case 'dots': {
        const max = section.max ?? 5;
        return (
          <View key={index} style={s.block}>
            {accentTitle(section.title)}
            <View style={s.box}>
              {section.fields.map((f) => {
                const n = Math.max(0, Math.min(max, Number.parseInt(traits[f.key] ?? '', 10) || 0));
                return (
                  <View key={f.key} style={s.row}>
                    <Text style={s.rowLabel}>{f.label}</Text>
                    <View style={s.dotTaps}>
                      {Array.from({ length: max }, (_, i) => (
                        <Pressable
                          key={i}
                          hitSlop={4}
                          onPress={() => setTrait(f.key, String(i + 1 === n ? i : i + 1))}>
                          <Text style={[s.dot, { color: theme.accent }]}>
                            {i < n ? '●' : '○'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      }
      case 'track':
        return (
          <View key={index} style={s.block}>
            {accentTitle(section.title)}
            <View style={s.box}>
              {section.fields.map((f) => (
                <View key={f.key} style={s.row}>
                  <Text style={s.rowLabel}>{f.label}</Text>
                  <TextInput
                    style={s.trackInput}
                    value={traits[f.key] ?? ''}
                    onChangeText={(v) => setTrait(f.key, v)}
                    placeholder={f.placeholder ?? '4/9'}
                    placeholderTextColor={ph}
                    maxLength={7}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      case 'text':
        return (
          <View key={index} style={s.block}>
            {accentTitle(section.title)}
            <TextInput
              style={s.note}
              value={traits[section.key] ?? ''}
              onChangeText={(v) => setTrait(section.key, v)}
              placeholder={section.placeholder ?? 'Notas…'}
              placeholderTextColor={ph}
              multiline
            />
          </View>
        );
      default: {
        // list / table / cards / chips: entradas + botón «+» con plantilla
        const isCards = section.kind === 'cards';
        const isChips = section.kind === 'chips';
        const labels = isChips
          ? ['Etiqueta']
          : isCards
            ? ['Título', 'Descripción']
            : section.kind === 'table'
              ? section.headers
              : ['Nombre', 'Valor', 'Etiqueta (COMP…)'];
        const entryLines = isChips
          ? (traits[section.key] ?? '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean)
          : lines(section.key);
        return (
          <View key={index} style={s.block}>
            {accentTitle(section.title)}
            {entryLines.map((line, i) => (
              <View key={i} style={s.entryRow}>
                <Text style={s.entryText}>{line.replace(' :: ', ' — ')}</Text>
                <Pressable
                  hitSlop={6}
                  onPress={() =>
                    isChips
                      ? setTrait(section.key, entryLines.filter((_, j) => j !== i).join(', '))
                      : removeLine(section.key, i)
                  }>
                  <Text style={s.remove}>✕</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[s.addRow, { borderColor: theme.border }]}
              onPress={() => {
                setDraft(labels.map(() => ''));
                setModal({
                  kind: 'entry',
                  title: section.title,
                  sectionKey: section.key,
                  labels: [...labels],
                  sep: isCards ? ' :: ' : ' · ',
                });
              }}>
              <Text style={[s.addLabel, { color: theme.accent }]}>＋ Añadir</Text>
            </Pressable>
          </View>
        );
      }
    }
  };

  const closeModal = () => setModal(null);

  return (
    <View style={[s.sheet, { borderColor: theme.border }]}>
      {/* héroe editable */}
      <View style={s.hero}>
        <LinearGradient colors={theme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emblem}>
          <Text style={s.emblemEmoji}>{theme.emblem}</Text>
        </LinearGradient>
        <View style={s.heroInputs}>
          <TextInput
            style={s.heroInput}
            value={meta.archetype}
            onChangeText={(v) => setMeta('archetype', v)}
            placeholder="Clase / arquetipo"
            placeholderTextColor={ph}
          />
          <View style={s.heroRow}>
            <TextInput
              style={[s.heroInput, s.heroSmall]}
              value={meta.level}
              onChangeText={(v) => setMeta('level', v)}
              placeholder="Nivel"
              placeholderTextColor={ph}
            />
            <TextInput
              style={[s.heroInput, s.heroSmall]}
              value={meta.age}
              onChangeText={(v) => setMeta('age', v)}
              placeholder="Edad"
              placeholderTextColor={ph}
              maxLength={20}
            />
          </View>
        </View>
      </View>

      <TextInput
        style={s.concept}
        value={meta.concept}
        onChangeText={(v) => setMeta('concept', v)}
        placeholder="«Concepto en una frase»"
        placeholderTextColor={ph}
      />

      {sections.map(renderSection)}

      <View style={s.block}>
        {accentTitle('Trasfondo')}
        <TextInput
          style={s.note}
          value={meta.backstory}
          onChangeText={(v) => setMeta('backstory', v)}
          placeholder="Su historia, sus cicatrices, lo que busca…"
          placeholderTextColor={ph}
          multiline
        />
      </View>

      {/* modal: desplegable de opciones / plantilla de entrada */}
      <Modal transparent visible={modal !== null} animationType="fade" onRequestClose={closeModal}>
        <Pressable style={s.backdrop} onPress={closeModal}>
          <Pressable style={s.modal} onPress={() => {}}>
            {modal && (
              <>
                <Text style={[s.modalTitle, { color: theme.accent }]}>{modal.title}</Text>
                {modal.kind === 'options' ? (
                  <ScrollView style={s.optionList}>
                    {modal.field.options!.map((option) => (
                      <Pressable
                        key={option}
                        style={s.option}
                        onPress={() => {
                          setTrait(modal.field.key, option);
                          closeModal();
                        }}>
                        <Text
                          style={[
                            s.optionText,
                            traits[modal.field.key] === option && { color: theme.accent },
                          ]}>
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                    {homebrew && (
                      <TextInput
                        style={s.modalInput}
                        placeholder="⌂ Tu versión homebrew…"
                        placeholderTextColor={ph}
                        onSubmitEditing={(e) => {
                          if (e.nativeEvent.text.trim()) {
                            setTrait(modal.field.key, e.nativeEvent.text.trim());
                            closeModal();
                          }
                        }}
                      />
                    )}
                    <Pressable
                      style={s.option}
                      onPress={() => {
                        setTrait(modal.field.key, '');
                        closeModal();
                      }}>
                      <Text style={s.clearText}>Dejar vacío</Text>
                    </Pressable>
                  </ScrollView>
                ) : (
                  <>
                    {modal.labels.map((label, i) => (
                      <TextInput
                        key={label + i}
                        style={s.modalInput}
                        value={draft[i] ?? ''}
                        onChangeText={(v) =>
                          setDraft((d) => d.map((x, j) => (j === i ? v : x)))
                        }
                        placeholder={label}
                        placeholderTextColor={ph}
                      />
                    ))}
                    <Pressable
                      style={[s.saveButton, { backgroundColor: theme.accent }]}
                      onPress={() => {
                        const parts = draft.map((x) => x.trim()).filter(Boolean);
                        if (parts.length > 0) {
                          if (modal.labels.length === 1 && modal.sep === ' · ' && !modal.title) {
                            setTrait(modal.sectionKey, parts[0]);
                          } else if (modal.labels[0] === 'Etiqueta') {
                            const prev = traits[modal.sectionKey] ?? '';
                            setTrait(modal.sectionKey, prev ? `${prev}, ${parts[0]}` : parts[0]);
                          } else if (modal.labels.length === 1) {
                            setTrait(modal.sectionKey, parts[0]);
                          } else {
                            const line = parts.join(modal.sep);
                            const prev = traits[modal.sectionKey] ?? '';
                            setTrait(modal.sectionKey, prev ? `${prev}\n${line}` : line);
                          }
                        }
                        closeModal();
                      }}>
                      <Text style={s.saveLabel}>Añadir</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const SURFACE = '#1B1B26';
const BORDER = 'rgba(255,255,255,0.1)';

const s = StyleSheet.create({
  sheet: { backgroundColor: '#101018', borderWidth: 1, borderRadius: 18, padding: 14, gap: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emblem: { width: 62, height: 62, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emblemEmoji: { fontSize: 30 },
  heroInputs: { flex: 1, gap: 6 },
  heroRow: { flexDirection: 'row', gap: 6 },
  heroInput: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 8, color: '#fff', fontSize: 13,
    fontFamily: RolderFonts.semibold,
  },
  heroSmall: { flex: 1 },
  concept: {
    color: 'rgba(255,255,255,0.85)', fontSize: 13, fontStyle: 'italic',
    fontFamily: RolderFonts.regular, borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingVertical: 4,
  },
  block: { gap: 8 },
  title: {
    fontSize: 10.5, fontFamily: RolderFonts.bold, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pill: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  pillEmpty: { borderStyle: 'dashed' },
  pillText: { fontSize: 11.5 },
  pillLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: RolderFonts.regular },
  pillValue: { color: '#fff', fontFamily: RolderFonts.bold, fontWeight: '700' },
  pillPlaceholder: { color: ph, fontFamily: RolderFonts.regular, fontStyle: 'italic' },
  hb: { fontSize: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  statCell: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingVertical: 7, paddingHorizontal: 2, alignItems: 'center', gap: 1, flexGrow: 1,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: RolderFonts.bold,
    fontWeight: '700', letterSpacing: 0.5,
  },
  statInput: {
    color: '#fff', fontSize: 16, fontFamily: RolderFonts.extrabold, fontWeight: '800',
    textAlign: 'center', minWidth: 44, padding: 0,
  },
  box: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 9, gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontFamily: RolderFonts.semibold,
    fontWeight: '600', width: 104,
  },
  dotTaps: { flexDirection: 'row', gap: 6, flex: 1 },
  dot: { fontSize: 15 },
  trackInput: {
    flex: 1, color: '#fff', fontSize: 12, fontFamily: RolderFonts.bold,
    textAlign: 'right', padding: 0,
  },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 11,
    paddingVertical: 8,
  },
  entryText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: RolderFonts.regular, flex: 1 },
  remove: { color: Rolder.pass, fontSize: 13, fontWeight: '700' },
  addRow: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 8,
    alignItems: 'center',
  },
  addLabel: { fontSize: 12, fontFamily: RolderFonts.bold, fontWeight: '700' },
  note: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10,
    color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 18,
    fontFamily: RolderFonts.regular, minHeight: 64, textAlignVertical: 'top',
  },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center',
    justifyContent: 'center', padding: 24,
  },
  modal: {
    width: '100%', maxWidth: 340, backgroundColor: '#16161F', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, gap: 10,
  },
  modalTitle: {
    fontSize: 11, fontFamily: RolderFonts.bold, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  optionList: { maxHeight: 320 },
  option: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  optionText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontFamily: RolderFonts.semibold },
  clearText: { color: Rolder.textTertiary, fontSize: 13, fontFamily: RolderFonts.regular },
  modalInput: {
    backgroundColor: Rolder.input, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: '#fff',
    fontSize: 13.5, fontFamily: RolderFonts.regular, marginTop: 6,
  },
  saveButton: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  saveLabel: { color: '#000', fontSize: 13, fontFamily: RolderFonts.bold, fontWeight: '700' },
});
