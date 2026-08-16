import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { showAlert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { StepperHeader } from '@/components/stepper-header';
import { ThemedText } from '@/components/themed-text';
import { PhotoPicker } from '@/components/photo-picker';
import { StyleAxis } from '@/components/style-axis';
import { ThemedView } from '@/components/themed-view';
import { OutlineButton, PrimaryButton, ScreenTitle, SectionLabel } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, RolderRadius, Spacing } from '@/constants/theme';
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

const SEAT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

// Los 11 campos partidos en tres pantallas cortas (entregable 3a):
// Identidad → Cómo jugáis → Estilo. El scroll infinito producía abandono.
const STEPS = ['Identidad', 'Cómo jugáis', 'Estilo'];

export default function NewGroupScreen() {
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
          image_url: imageUrl,
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
      showAlert('No se pudo crear la mesa', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          onBack={() =>
            step > 0
              ? setStep((s) => s - 1)
              : router.canGoBack()
                ? router.back()
                : router.replace('/groups')
          }
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenTitle>Crear mesa</ScreenTitle>
          <StepperHeader steps={STEPS} current={step} />

          {step === 0 && (
            <>
              {session && (
                <PhotoPicker
                  userId={session.user.id}
                  prefix="group"
                  url={imageUrl}
                  onPicked={setImageUrl}
                  shape="card"
                  label="Foto de la mesa"
                />
              )}

              <SectionLabel>Nombre de la mesa</SectionLabel>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="La tumba de la aniquilación — viernes noche"
                placeholderTextColor="#888"
              />

              <SectionLabel>Sistema</SectionLabel>
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

              <SectionLabel>Formato</SectionLabel>
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
            </>
          )}

          {step === 1 && (
            <>
              <SectionLabel>Descripción (opcional)</SectionLabel>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Qué campaña jugáis, tono de la mesa, qué buscáis…"
                placeholderTextColor="#888"
                multiline
              />

              <SectionLabel>Día de sesión</SectionLabel>
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

              <SectionLabel>Franja</SectionLabel>
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

              <SectionLabel>Frecuencia</SectionLabel>
              <View style={styles.chipRow}>
                {FREQUENCIES.map((f) => (
                  <Chip
                    key={f}
                    label={f}
                    selected={frequency === f}
                    onPress={() => setFrequency(f)}
                  />
                ))}
              </View>

              <SectionLabel>Límite de jugadores (sin contarte)</SectionLabel>
              <View style={styles.chipRow}>
                {SEAT_OPTIONS.map((n) => (
                  <Chip
                    key={n}
                    label={String(n)}
                    selected={seats === n}
                    onPress={() => setSeats(n)}
                  />
                ))}
              </View>

              <SectionLabel>Experiencia buscada</SectionLabel>
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

              <SectionLabel>VTT</SectionLabel>
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

              <SectionLabel>Invitación a vuestro Discord (opcional)</SectionLabel>
              <TextInput
                style={styles.input}
                value={discordInvite}
                onChangeText={setDiscordInvite}
                placeholder="https://discord.gg/…"
                placeholderTextColor="#888"
                autoCapitalize="none"
              />
            </>
          )}

          {step === 2 && (
            <>
              <SectionLabel>Estilo de la mesa</SectionLabel>
              <StyleAxis
                left="Combate"
                right="Narrativo"
                value={combatNarrative}
                onChange={setCombatNarrative}
              />
              <StyleAxis
                left="Serio"
                right="Humor"
                value={seriousHumor}
                onChange={setSeriousHumor}
              />
              <StyleAxis
                left="Roleo ligero"
                right="Roleo pesado"
                value={roleplayWeight}
                onChange={setRoleplayWeight}
              />
              <ThemedText type="small" style={styles.styleHint}>
                Los sliders alimentan el matching: cuanto más fino, mejores candidatos.
              </ThemedText>
            </>
          )}

          <View style={styles.nav}>
            <OutlineButton
              label={step === 0 ? 'Cancelar' : '← Atrás'}
              tone="white"
              onPress={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
              disabled={busy}
              style={styles.cancelButton}
            />
            {step < STEPS.length - 1 ? (
              <PrimaryButton
                label="Siguiente →"
                onPress={() => setStep((s) => s + 1)}
                // el paso 1 lleva lo imprescindible: nombre y sistema
                disabled={step === 0 && !valid}
                style={styles.publishButton}
              />
            ) : (
              <PrimaryButton
                label={busy ? 'Publicando…' : 'Publicar mesa'}
                onPress={handleCreate}
                disabled={!valid || busy}
                style={styles.publishButton}
              />
            )}
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
    padding: 20,
    gap: Spacing.three,
  },
  input: {
    backgroundColor: Rolder.input,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: RolderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.regular,
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
    gap: 10,
    marginTop: Spacing.four,
  },
  cancelButton: {
    flex: 1,
  },
  publishButton: {
    flex: 2,
  },
  styleHint: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
