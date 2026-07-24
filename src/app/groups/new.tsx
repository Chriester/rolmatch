import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/chip';
import { StyleAxis } from '@/components/style-axis';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  SLOT_LABELS,
  VTT_LABELS,
  WEEKDAY_LABELS,
  createGroup,
  type GroupFormat,
} from '@/lib/groups';
import {
  detectTimezone,
  fetchSystems,
  type ExperienceLevel,
  type System,
  type VttType,
} from '@/lib/profile';

const FORMATS: { value: GroupFormat; label: string }[] = [
  { value: 'campaign', label: 'Campaña' },
  { value: 'oneshot', label: 'One-shot' },
];

const FREQUENCIES = ['Semanal', 'Quincenal', 'Mensual', 'Puntual'];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel | null; label: string }[] = [
  { value: null, label: 'Cualquiera' },
  { value: 'none', label: 'Sin experiencia' },
  { value: 'beginner', label: 'Novato' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'veteran', label: 'Veterano' },
];

const SEAT_OPTIONS = [1, 2, 3, 4, 5];

export default function NewGroupScreen() {
  const session = useSession();
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [systems, setSystems] = useState<System[]>([]);
  const [systemId, setSystemId] = useState<number | null>(null);
  const [format, setFormat] = useState<GroupFormat>('campaign');
  const [description, setDescription] = useState('');
  const [weekday, setWeekday] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<string | null>('Semanal');
  const [seats, setSeats] = useState(2);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [combatNarrative, setCombatNarrative] = useState(50);
  const [seriousHumor, setSeriousHumor] = useState(50);
  const [roleplayWeight, setRoleplayWeight] = useState(50);
  const [vtt, setVtt] = useState<VttType>('discord_only');
  const [discordInvite, setDiscordInvite] = useState('');

  useEffect(() => {
    fetchSystems().then(setSystems).catch(() => {});
  }, []);

  const valid = name.trim().length > 0 && systemId !== null;

  const handleCreate = async () => {
    if (!session || !valid) return;
    setBusy(true);
    try {
      const groupId = await createGroup(
        session.user.id,
        {
          name: name.trim(),
          system_id: systemId,
          format,
          description: description.trim() || null,
          timezone: detectTimezone(),
          session_weekday: weekday,
          session_slot: slot,
          frequency,
          experience_wanted: experience,
          style_combat_narrative: combatNarrative,
          style_serious_humor: seriousHumor,
          style_roleplay_weight: roleplayWeight,
          vtt,
          discord_invite_url: discordInvite.trim() || null,
        },
        seats
      );
      router.replace({ pathname: '/groups/[id]', params: { id: groupId } });
    } catch (error) {
      Alert.alert('No se pudo crear la mesa', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title">Crear mesa</ThemedText>

          <ThemedText type="small">Nombre de la mesa</ThemedText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="La tumba de la aniquilación — viernes noche"
            placeholderTextColor="#888"
          />

          <ThemedText type="small">Sistema</ThemedText>
          <View style={styles.chipRow}>
            {systems.map((system) => (
              <Chip
                key={system.id}
                label={system.name}
                selected={systemId === system.id}
                onPress={() => setSystemId(system.id)}
              />
            ))}
          </View>

          <ThemedText type="small">Formato</ThemedText>
          <View style={styles.chipRow}>
            {FORMATS.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                selected={format === f.value}
                onPress={() => setFormat(f.value)}
              />
            ))}
          </View>

          <ThemedText type="small">Descripción (opcional)</ThemedText>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Qué campaña jugáis, tono de la mesa, qué buscáis…"
            placeholderTextColor="#888"
            multiline
          />

          <ThemedText type="small">Día de sesión</ThemedText>
          <View style={styles.chipRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Chip
                key={label}
                label={label}
                selected={weekday === index}
                onPress={() => setWeekday(weekday === index ? null : index)}
              />
            ))}
          </View>

          <ThemedText type="small">Franja</ThemedText>
          <View style={styles.chipRow}>
            {SLOT_LABELS.map((label, index) => (
              <Chip
                key={label}
                label={label}
                selected={slot === index}
                onPress={() => setSlot(slot === index ? null : index)}
              />
            ))}
          </View>

          <ThemedText type="small">Frecuencia</ThemedText>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((f) => (
              <Chip key={f} label={f} selected={frequency === f} onPress={() => setFrequency(f)} />
            ))}
          </View>

          <ThemedText type="small">Plazas libres</ThemedText>
          <View style={styles.chipRow}>
            {SEAT_OPTIONS.map((n) => (
              <Chip key={n} label={String(n)} selected={seats === n} onPress={() => setSeats(n)} />
            ))}
          </View>

          <ThemedText type="small">Experiencia buscada</ThemedText>
          <View style={styles.chipRow}>
            {EXPERIENCE_OPTIONS.map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                selected={experience === option.value}
                onPress={() => setExperience(option.value)}
              />
            ))}
          </View>

          <ThemedText type="small">Estilo de la mesa</ThemedText>
          <StyleAxis
            left="Combate"
            right="Narrativo"
            value={combatNarrative}
            onChange={setCombatNarrative}
          />
          <StyleAxis left="Serio" right="Humor" value={seriousHumor} onChange={setSeriousHumor} />
          <StyleAxis
            left="Roleo ligero"
            right="Roleo pesado"
            value={roleplayWeight}
            onChange={setRoleplayWeight}
          />

          <ThemedText type="small">VTT</ThemedText>
          <View style={styles.chipRow}>
            {(Object.keys(VTT_LABELS) as VttType[]).map((value) => (
              <Chip
                key={value}
                label={VTT_LABELS[value]}
                selected={vtt === value}
                onPress={() => setVtt(value)}
              />
            ))}
          </View>

          <ThemedText type="small">Invitación a vuestro Discord (opcional)</ThemedText>
          <TextInput
            style={styles.input}
            value={discordInvite}
            onChangeText={setDiscordInvite}
            placeholder="https://discord.gg/…"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />

          <View style={styles.nav}>
            <Pressable style={styles.secondaryButton} onPress={() => router.back()} disabled={busy}>
              <ThemedText>Cancelar</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, (!valid || busy) && styles.disabled]}
              onPress={handleCreate}
              disabled={!valid || busy}>
              <ThemedText style={styles.primaryLabel}>
                {busy ? 'Creando…' : 'Crear mesa'}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  primaryButton: {
    backgroundColor: '#5865F2',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  disabled: {
    opacity: 0.5,
  },
});
