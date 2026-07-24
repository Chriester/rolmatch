import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvailabilityGrid, availabilityKey } from '@/components/availability-grid';
import { Chip } from '@/components/chip';
import { StyleAxis } from '@/components/style-axis';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  detectTimezone,
  fetchProfileAlias,
  fetchSystems,
  saveOnboarding,
  type ExperienceLevel,
  type System,
  type UserRole,
  type VttType,
} from '@/lib/profile';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'player', label: 'Jugador/a' },
  { value: 'gm', label: 'GM / Máster' },
  { value: 'both', label: 'Ambos' },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Novato' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'veteran', label: 'Veterano' },
];

const VTTS: { value: VttType; label: string }[] = [
  { value: 'discord_only', label: 'Solo Discord' },
  { value: 'roll20', label: 'Roll20' },
  { value: 'foundry', label: 'Foundry' },
  { value: 'other', label: 'Otro' },
];

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const session = useSession();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Paso 1 — quién eres
  const [alias, setAlias] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [bio, setBio] = useState('');

  // Paso 2 — cuándo juegas
  const [timezone, setTimezone] = useState(detectTimezone());
  const [availability, setAvailability] = useState<Set<string>>(new Set());

  // Paso 3 — a qué juegas
  const [systems, setSystems] = useState<System[]>([]);
  const [experienceBySystem, setExperienceBySystem] = useState<Map<number, ExperienceLevel>>(
    new Map()
  );
  const [openToAny, setOpenToAny] = useState(false);

  // Paso 4 — cómo juegas
  const [combatNarrative, setCombatNarrative] = useState(50);
  const [seriousHumor, setSeriousHumor] = useState(50);
  const [roleplayWeight, setRoleplayWeight] = useState(50);
  const [voiceChat, setVoiceChat] = useState(true);
  const [cameraOk, setCameraOk] = useState(false);
  const [vtt, setVtt] = useState<VttType>('discord_only');

  useEffect(() => {
    fetchSystems().then(setSystems).catch(() => {});
    if (session) {
      fetchProfileAlias(session.user.id)
        .then((current) => current && setAlias(current))
        .catch(() => {});
    }
  }, [session]);

  const toggleAvailability = (weekday: number, slot: number) => {
    setAvailability((prev) => {
      const next = new Set(prev);
      const key = availabilityKey(weekday, slot);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSystem = (systemId: number) => {
    setExperienceBySystem((prev) => {
      const next = new Map(prev);
      if (next.has(systemId)) next.delete(systemId);
      else next.set(systemId, 'beginner');
      return next;
    });
  };

  const setExperience = (systemId: number, experience: ExperienceLevel) => {
    setExperienceBySystem((prev) => new Map(prev).set(systemId, experience));
  };

  const stepValid = () => {
    switch (step) {
      case 0:
        return alias.trim().length > 0;
      case 1:
        return availability.size > 0;
      case 2:
        return openToAny || experienceBySystem.size > 0;
      default:
        return true;
    }
  };

  const handleFinish = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await saveOnboarding(
        session.user.id,
        {
          alias: alias.trim(),
          bio: bio.trim() || null,
          timezone: timezone.trim() || 'UTC',
          role,
          style_combat_narrative: combatNarrative,
          style_serious_humor: seriousHumor,
          style_roleplay_weight: roleplayWeight,
          voice_chat: voiceChat,
          camera_ok: cameraOk,
          preferred_vtt: vtt,
          open_to_any_system: openToAny,
        },
        [...availability].map((key) => {
          const [weekday, slot] = key.split('-').map(Number);
          return { weekday, slot };
        }),
        [...experienceBySystem].map(([system_id, experience]) => ({ system_id, experience }))
      );
      router.replace('/');
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="small" style={styles.progress}>
            Paso {step + 1} de {TOTAL_STEPS}
          </ThemedText>

          {step === 0 && (
            <View style={styles.section}>
              <ThemedText type="title">¿Quién eres?</ThemedText>
              <ThemedText type="small">Tu alias en las mesas</ThemedText>
              <TextInput
                style={styles.input}
                value={alias}
                onChangeText={setAlias}
                placeholder="Alias"
                placeholderTextColor="#888"
              />
              <ThemedText type="small">Tu rol habitual</ThemedText>
              <View style={styles.chipRow}>
                {ROLES.map((r) => (
                  <Chip
                    key={r.value}
                    label={r.label}
                    selected={role === r.value}
                    onPress={() => setRole(r.value)}
                  />
                ))}
              </View>
              <ThemedText type="small">Bio corta (opcional)</ThemedText>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={bio}
                onChangeText={setBio}
                placeholder="Cuéntale al mundo cómo juegas…"
                placeholderTextColor="#888"
                multiline
              />
            </View>
          )}

          {step === 1 && (
            <View style={styles.section}>
              <ThemedText type="title">¿Cuándo puedes jugar?</ThemedText>
              <ThemedText type="small">
                Marca tus franjas libres (en tu hora local). Es lo que usamos para no
                emparejarte nunca con mesas imposibles.
              </ThemedText>
              <AvailabilityGrid selected={availability} onToggle={toggleAvailability} />
              <ThemedText type="small">Zona horaria (detectada automáticamente)</ThemedText>
              <TextInput
                style={styles.input}
                value={timezone}
                onChangeText={setTimezone}
                autoCapitalize="none"
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <ThemedText type="title">¿A qué juegas?</ThemedText>
              {systems.map((system) => {
                const experience = experienceBySystem.get(system.id);
                return (
                  <View key={system.id} style={styles.systemRow}>
                    <Chip
                      label={system.name}
                      selected={experience !== undefined}
                      onPress={() => toggleSystem(system.id)}
                    />
                    {experience !== undefined && (
                      <View style={styles.chipRow}>
                        {EXPERIENCE_LEVELS.map((level) => (
                          <Chip
                            key={level.value}
                            label={level.label}
                            selected={experience === level.value}
                            onPress={() => setExperience(system.id, level.value)}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={styles.switchRow}>
                <ThemedText>Abierto/a a cualquier sistema</ThemedText>
                <Switch value={openToAny} onValueChange={setOpenToAny} />
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.section}>
              <ThemedText type="title">¿Cómo juegas?</ThemedText>
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
              <View style={styles.switchRow}>
                <ThemedText>Juego con voz</ThemedText>
                <Switch value={voiceChat} onValueChange={setVoiceChat} />
              </View>
              <View style={styles.switchRow}>
                <ThemedText>Cámara encendida</ThemedText>
                <Switch value={cameraOk} onValueChange={setCameraOk} />
              </View>
              <ThemedText type="small">VTT preferido</ThemedText>
              <View style={styles.chipRow}>
                {VTTS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={vtt === option.value}
                    onPress={() => setVtt(option.value)}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.nav}>
            {step > 0 && (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setStep((s) => s - 1)}
                disabled={busy}>
                <ThemedText>Anterior</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.primaryButton, (!stepValid() || busy) && styles.disabled]}
              onPress={() => (step < TOTAL_STEPS - 1 ? setStep((s) => s + 1) : handleFinish())}
              disabled={!stepValid() || busy}>
              <ThemedText style={styles.primaryLabel}>
                {step < TOTAL_STEPS - 1 ? 'Siguiente' : busy ? 'Guardando…' : 'Terminar'}
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
  progress: {
    textAlign: 'center',
  },
  section: {
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
  systemRow: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
