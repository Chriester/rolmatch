import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Chip } from '@/components/chip';
import { PhotoPicker } from '@/components/photo-picker';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  CHARACTER_STATUS_LABELS,
  type CharacterInput,
  type CharacterStatus,
} from '@/lib/characters';
import { fetchSystems, type System } from '@/lib/profile';

type CharacterFormProps = {
  userId: string;
  initial?: CharacterInput;
  busy: boolean;
  submitLabel: string;
  onSubmit: (input: CharacterInput) => void;
};

export function CharacterForm({ userId, initial, busy, submitLabel, onSubmit }: CharacterFormProps) {
  const [systems, setSystems] = useState<System[]>([]);
  const [name, setName] = useState(initial?.name ?? '');
  const [portraitUrl, setPortraitUrl] = useState<string | null>(initial?.portrait_url ?? null);
  const [systemId, setSystemId] = useState<number | null>(initial?.system_id ?? null);
  const [archetype, setArchetype] = useState(initial?.archetype ?? '');
  const [level, setLevel] = useState(initial?.level ?? '');
  const [concept, setConcept] = useState(initial?.concept ?? '');
  const [backstory, setBackstory] = useState(initial?.backstory ?? '');
  const [status, setStatus] = useState<CharacterStatus>(initial?.status ?? 'looking');

  useEffect(() => {
    fetchSystems().then(setSystems).catch(() => {});
  }, []);

  const valid = name.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <PhotoPicker
        userId={userId}
        prefix="character"
        url={portraitUrl}
        onPicked={setPortraitUrl}
        label="Retrato"
      />

      <ThemedText type="small">Nombre del personaje</ThemedText>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Karlach la Incandescente"
        placeholderTextColor="#888"
      />

      <ThemedText type="small">Sistema</ThemedText>
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
          <ThemedText type="small">Clase / arquetipo</ThemedText>
          <TextInput
            style={styles.input}
            value={archetype}
            onChangeText={setArchetype}
            placeholder="Bárbara"
            placeholderTextColor="#888"
          />
        </View>
        <View style={styles.column}>
          <ThemedText type="small">Nivel</ThemedText>
          <TextInput
            style={styles.input}
            value={level}
            onChangeText={setLevel}
            placeholder="5"
            placeholderTextColor="#888"
          />
        </View>
      </View>

      <ThemedText type="small">Concepto (1-2 frases)</ThemedText>
      <TextInput
        style={styles.input}
        value={concept}
        onChangeText={setConcept}
        placeholder="Fugitiva del infierno con un motor infernal por corazón"
        placeholderTextColor="#888"
      />

      <ThemedText type="small">Trasfondo breve (opcional)</ThemedText>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={backstory}
        onChangeText={setBackstory}
        placeholder="Su historia, sus cicatrices, lo que busca…"
        placeholderTextColor="#888"
        multiline
      />

      <ThemedText type="small">Estado</ThemedText>
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

      <Pressable
        style={[styles.submitButton, (!valid || busy) && styles.disabled]}
        disabled={!valid || busy}
        onPress={() =>
          onSubmit({
            name: name.trim(),
            portrait_url: portraitUrl,
            system_id: systemId,
            archetype: archetype.trim() || null,
            level: level.trim() || null,
            concept: concept.trim() || null,
            backstory: backstory.trim() || null,
            status,
          })
        }>
        <ThemedText style={styles.submitLabel}>{busy ? 'Guardando…' : submitLabel}</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  input: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    color: '#888',
  },
  multiline: {
    minHeight: 100,
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
    gap: Spacing.three,
  },
  submitButton: {
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
