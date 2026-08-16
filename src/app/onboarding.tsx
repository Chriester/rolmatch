import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { humanizeError, showAlert } from '@/lib/alert';
import { track } from '@/lib/analytics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvailabilityGrid, availabilityKey } from '@/components/availability-grid';
import { Chip } from '@/components/chip';
import { PhotoPicker } from '@/components/photo-picker';
import { StyleAxis } from '@/components/style-axis';
import { ThemedView } from '@/components/themed-view';
import { OutlineButton, PrimaryButton, SectionLabel } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, RolderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  GENDER_LABELS,
  SAFETY_TOOL_LABELS,
  ageFromBirthYear,
  detectTimezone,
  fetchProfileData,
  fetchSystems,
  saveOnboarding,
  type ExperienceLevel,
  type Gender,
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

// Solo zonas IANA válidas: el campo de texto libre nos coló un "GMT+1"
// que reventaba el matching. Si la detectada no está aquí, aparece como
// chip extra ya seleccionado.
const TIMEZONES: { value: string; label: string }[] = [
  { value: 'Europe/Madrid', label: 'España (península)' },
  { value: 'Atlantic/Canary', label: 'Canarias' },
  { value: 'America/Mexico_City', label: 'México' },
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Lima', label: 'Perú' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'America/Montevideo', label: 'Uruguay' },
  { value: 'America/Caracas', label: 'Venezuela' },
  { value: 'America/New_York', label: 'EE. UU. (Este)' },
];

const TOTAL_STEPS = 4;
const STEP_TITLES = ['Quién eres', 'Cuándo juegas', 'A qué juegas', 'Cómo juegas'];

// Si venía de un enlace compartido (p. ej. invitación a una mesa), al acabar
// el perfil retomamos el proceso donde lo dejó en vez de mandarle al feed.
function nextRouteAfterOnboarding(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const pending = localStorage.getItem('rolder-ruta-pendiente');
    if (pending) {
      localStorage.removeItem('rolder-ruta-pendiente');
      return pending;
    }
  }
  return '/';
}

export default function OnboardingScreen() {
  const session = useSession();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  // primera vez que se completa el perfil → pantalla de celebración
  const [wasComplete, setWasComplete] = useState(false);
  /** el perfil ya se leyó: hasta entonces no sabemos si esto es un alta */
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Paso 1 — quién eres
  const [alias, setAlias] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [ageText, setAgeText] = useState('');

  // Paso 2 — cuándo juegas
  const [timezone, setTimezone] = useState(detectTimezone());
  const [availability, setAvailability] = useState<Set<string>>(new Set());
  // feedback del botón de detectar: sin esto, si ya estabas en la zona
  // detectada el botón parecía roto (no cambiaba nada visible)
  const [detectedTz, setDetectedTz] = useState<string | null>(null);

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
  const [safetyTools, setSafetyTools] = useState<Set<string>>(new Set());

  // Precarga el perfil actual: la misma pantalla sirve de onboarding
  // inicial y de editor de perfil.
  useEffect(() => {
    fetchSystems().then(setSystems).catch(() => {});
    if (!session) return;
    fetchProfileData(session.user.id)
      .then((profile) => {
        setAlias(profile.alias);
        setRole(profile.role);
        setBio(profile.bio ?? '');
        setAvatarUrl(profile.avatar_url);
        setGender(profile.gender);
        const age = ageFromBirthYear(profile.birth_year);
        setAgeText(age === null ? '' : String(age));
        if (profile.availability.length > 0) {
          setWasComplete(true);
          setTimezone(profile.timezone);
          setAvailability(
            new Set(profile.availability.map((a) => availabilityKey(a.weekday, a.slot)))
          );
        }
        setExperienceBySystem(new Map(profile.systems.map((s) => [s.system_id, s.experience])));
        setOpenToAny(profile.open_to_any_system);
        setCombatNarrative(profile.style_combat_narrative);
        setSeriousHumor(profile.style_serious_humor);
        setRoleplayWeight(profile.style_roleplay_weight);
        setVoiceChat(profile.voice_chat);
        setCameraOk(profile.camera_ok);
        setVtt(profile.preferred_vtt);
        setSafetyTools(new Set(profile.safety_tools));
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
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

  // Edad obligatoria desde la alpha: mínimo 16 (mesas con desconocidos)
  const parsedAge = (() => {
    const n = Number.parseInt(ageText.trim(), 10);
    return Number.isInteger(n) && n >= 16 && n <= 99 ? n : null;
  })();

  // Para el guardado rápido al editar: todo lo obligatorio de todos los pasos
  const allValid = () =>
    alias.trim().length > 0 &&
    avatarUrl !== null &&
    parsedAge !== null &&
    availability.size > 0 &&
    (openToAny || experienceBySystem.size > 0);

  const stepValid = () => {
    switch (step) {
      case 0:
        return alias.trim().length > 0 && avatarUrl !== null && parsedAge !== null;
      case 1:
        return availability.size > 0;
      case 2:
        return openToAny || experienceBySystem.size > 0;
      default:
        return true;
    }
  };

  // Embudo de alta: dónde se queda la gente que aún no tiene perfil. No se
  // registra a quien vuelve a editarlo (wasComplete), que no es un alta.
  useEffect(() => {
    if (!session || !profileLoaded || wasComplete) return;
    track(session.user.id, 'onboarding_step', { step });
  }, [session, profileLoaded, wasComplete, step]);

  const handleFinish = async () => {
    if (!session) return;
    setBusy(true);
    try {
      await saveOnboarding(
        session.user.id,
        {
          alias: alias.trim(),
          bio: bio.trim() || null,
          gender,
          birth_year: parsedAge === null ? null : new Date().getFullYear() - parsedAge,
          timezone: timezone.trim() || 'UTC',
          role,
          avatar_url: avatarUrl,
          style_combat_narrative: combatNarrative,
          style_serious_humor: seriousHumor,
          style_roleplay_weight: roleplayWeight,
          voice_chat: voiceChat,
          camera_ok: cameraOk,
          preferred_vtt: vtt,
          open_to_any_system: openToAny,
          safety_tools: [...safetyTools],
        },
        [...availability].map((key) => {
          const [weekday, slot] = key.split('-').map(Number);
          return { weekday, slot };
        }),
        [...experienceBySystem].map(([system_id, experience]) => ({ system_id, experience }))
      );
      if (wasComplete) {
        router.replace(nextRouteAfterOnboarding() as never);
      } else {
        // solo la primera vez: esto es el numerador de «% perfiles completos»
        track(session.user.id, 'onboarding_completed');
        setCelebrate(true);
      }
    } catch (error) {
      showAlert('No se pudo guardar', humanizeError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>{STEP_TITLES[step]}</Text>
            <Text style={styles.stepCount}>
              Paso {step + 1} de {TOTAL_STEPS}
            </Text>
          </View>
          <View style={styles.progressRow}>
            {STEP_TITLES.map((_, i) => (
              // editando (perfil ya completo), la barra navega directa al paso
              <Pressable
                key={i}
                style={styles.progressTouch}
                disabled={!wasComplete}
                onPress={() => setStep(i)}
                accessibilityLabel={`Ir al paso ${i + 1}`}>
                <View style={[styles.progressSegment, i <= step && styles.progressDone]} />
              </Pressable>
            ))}
          </View>

          {step === 0 && (
            <View style={styles.section}>
              {session && (
                <PhotoPicker
                  userId={session.user.id}
                  prefix="avatar"
                  url={avatarUrl}
                  onPicked={setAvatarUrl}
                  label="Tu foto o avatar *"
                />
              )}
              {!avatarUrl && (
                <Text style={styles.helper}>
                  Una imagen es obligatoria: puede ser tu foto o un avatar/ilustración que te
                  represente. Los perfiles con cara consiguen muchos más matches.
                </Text>
              )}
              <SectionLabel>Alias *</SectionLabel>
              <TextInput
                style={styles.input}
                value={alias}
                onChangeText={setAlias}
                placeholder="Tu alias en las mesas"
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <View style={styles.genderAgeRow}>
                <View style={styles.genderColumn}>
                  <SectionLabel>Género</SectionLabel>
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
                <View style={styles.ageColumn}>
                  <SectionLabel>Edad *</SectionLabel>
                  <TextInput
                    style={styles.input}
                    value={ageText}
                    onChangeText={setAgeText}
                    placeholder="16+"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
              <SectionLabel>Tu rol</SectionLabel>
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
              <SectionLabel>Bio corta</SectionLabel>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={bio}
                onChangeText={setBio}
                placeholder="Qué buscas, cómo juegas, qué te hace reír…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                multiline
              />
            </View>
          )}

          {step === 1 && (
            <View style={styles.section}>
              <View style={styles.tzBanner}>
                <Text style={styles.tzBannerText}>{timezone || 'Zona horaria'}</Text>
              </View>
              <Text style={styles.helper}>
                Toca una franja o deja pulsado y arrastra para pintar varias (en tu hora local).
                Es lo que usamos para no emparejarte nunca con mesas imposibles.
              </Text>
              <AvailabilityGrid selected={availability} onToggle={toggleAvailability} />
              <Text style={styles.counter}>
                {availability.size === 0
                  ? 'Marca al menos una franja'
                  : `${availability.size} ${availability.size === 1 ? 'franja marcada' : 'franjas marcadas'}`}
              </Text>
              <SectionLabel>Zona horaria</SectionLabel>
              <OutlineButton
                label="Detectar mi zona horaria"
                onPress={() => {
                  const tz = detectTimezone();
                  setTimezone(tz);
                  setDetectedTz(tz);
                }}
              />
              {detectedTz && (
                <Text style={styles.counter}>
                  ✓ Detectada:{' '}
                  {TIMEZONES.find((tz) => tz.value === detectedTz)?.label ?? detectedTz}
                </Text>
              )}
              <View style={styles.chipRow}>
                {TIMEZONES.map((tz) => (
                  <Chip
                    key={tz.value}
                    label={tz.label}
                    selected={timezone === tz.value}
                    onPress={() => setTimezone(tz.value)}
                  />
                ))}
                {!TIMEZONES.some((tz) => tz.value === timezone) && (
                  <Chip label={timezone} selected onPress={() => {}} />
                )}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Abierto/a a cualquier sistema</Text>
                <Switch
                  value={openToAny}
                  onValueChange={setOpenToAny}
                  trackColor={{ true: Rolder.like, false: 'rgba(255,255,255,0.15)' }}
                />
              </View>
              <SectionLabel>Tus sistemas</SectionLabel>
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
            </View>
          )}

          {step === 3 && (
            <View style={styles.section}>
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
                <Text style={styles.switchLabel}>Juego con voz</Text>
                <Switch
                  value={voiceChat}
                  onValueChange={setVoiceChat}
                  trackColor={{ true: Rolder.like, false: 'rgba(255,255,255,0.15)' }}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Cámara encendida</Text>
                <Switch
                  value={cameraOk}
                  onValueChange={setCameraOk}
                  trackColor={{ true: Rolder.like, false: 'rgba(255,255,255,0.15)' }}
                />
              </View>
              <SectionLabel>Mesa virtual</SectionLabel>
              <View style={styles.chipRow}>
                {VTTS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    selected={vtt === option.value}
                    onPress={() => setVtt(option.value)}
                  />
                ))}
                {/* placeholder del modo presencial (fase 4, geolocalización) */}
                <Chip label="Presencial · pronto" selected={false} disabled onPress={() => {}} />
              </View>
              <SectionLabel>Seguridad en mesa</SectionLabel>
              <Text style={styles.helper}>
                Herramientas que usas o esperas en tus partidas. Se muestran en tu perfil para
                que las mesas sepan cómo cuidas el juego.
              </Text>
              <View style={styles.chipRow}>
                {Object.entries(SAFETY_TOOL_LABELS).map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    selected={safetyTools.has(value)}
                    onPress={() =>
                      setSafetyTools((prev) => {
                        const next = new Set(prev);
                        if (next.has(value)) next.delete(value);
                        else next.add(value);
                        return next;
                      })
                    }
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.nav}>
            {step > 0 && (
              <OutlineButton
                label="Atrás"
                tone="white"
                onPress={() => setStep((s) => s - 1)}
                disabled={busy}
                style={styles.backButton}
              />
            )}
            <PrimaryButton
              label={
                step < TOTAL_STEPS - 1
                  ? 'Siguiente'
                  : busy
                    ? 'Guardando…'
                    : wasComplete
                      ? 'Guardar cambios'
                      : 'Guardar y buscar mesa'
              }
              onPress={() => (step < TOTAL_STEPS - 1 ? setStep((s) => s + 1) : handleFinish())}
              disabled={!stepValid() || busy}
              style={styles.nextButton}
            />
          </View>

          {/* editando: guardar desde cualquier paso sin recorrer los cuatro */}
          {wasComplete && step < TOTAL_STEPS - 1 && (
            <Pressable onPress={handleFinish} disabled={!allValid() || busy}>
              <Text
                style={[styles.quickSave, (!allValid() || busy) && styles.quickSaveDisabled]}>
                {busy ? 'Guardando…' : 'Guardar cambios ya'}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>

      {celebrate && (
        <Modal transparent visible animationType="fade">
          <View style={styles.celebrateBackdrop}>
            <View style={styles.celebrateCard}>
              <Text style={styles.celebrateEmoji}>🎲</Text>
              <Text style={styles.celebrateTitle}>¡Perfil listo!</Text>
              <Text style={styles.celebrateBody}>
                Ya apareces en el feed de las mesas compatibles contigo. Completa tu foto y bio
                (si no lo has hecho) y gana tus primeros puntos de experiencia.
              </Text>
              <PrimaryButton
                label="¡A rodar dados!"
                onPress={() => router.replace(nextRouteAfterOnboarding() as never)}
              />
            </View>
          </View>
        </Modal>
      )}
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
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  stepTitle: {
    color: '#fff',
    fontSize: 19,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  stepCount: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.semibold,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressTouch: {
    flex: 1,
    paddingVertical: 6,
  },
  progressSegment: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  quickSave: {
    color: Rolder.violetSoft,
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    textAlign: 'center',
    paddingVertical: 6,
  },
  quickSaveDisabled: {
    opacity: 0.4,
  },
  progressDone: {
    backgroundColor: Rolder.violet,
  },
  section: {
    gap: Spacing.three,
  },
  helper: {
    color: Rolder.textSecondary,
    fontSize: 13,
    fontFamily: RolderFonts.regular,
    lineHeight: 18,
  },
  counter: {
    color: Rolder.violetSoft,
    fontSize: 12.5,
    fontFamily: RolderFonts.semibold,
  },
  tzBanner: {
    backgroundColor: 'rgba(199,125,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tzBannerText: {
    color: Rolder.violetSofter,
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
  },
  switchLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: RolderFonts.regular,
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
  celebrateBackdrop: {
    flex: 1,
    backgroundColor: Rolder.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  celebrateCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: 'rgba(199,125,255,0.4)',
    borderRadius: RolderRadius.xl,
    padding: 24,
    alignItems: 'center',
    gap: Spacing.three,
  },
  celebrateEmoji: {
    fontSize: 56,
  },
  celebrateTitle: {
    color: '#fff',
    fontSize: 22,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
  },
  celebrateBody: {
    color: Rolder.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
  },
  genderAgeRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  genderColumn: {
    flex: 1,
    gap: Spacing.two,
  },
  ageColumn: {
    width: 88,
    gap: Spacing.two,
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
    gap: 10,
    marginTop: Spacing.four,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
