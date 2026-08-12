// Editar mesa: el mismo formulario de crear, precargado; solo el dueño
// (el RLS bloquea el update a cualquier otro).

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { confirmAction, showAlert } from '@/lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { Chip } from '@/components/chip';
import { PhotoPicker } from '@/components/photo-picker';
import { StyleAxis } from '@/components/style-axis';
import { ThemedView } from '@/components/themed-view';
import { OutlineButton, PrimaryButton, ScreenTitle, SectionLabel } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import {
  SLOT_LABELS,
  VTT_LABELS,
  WEEKDAY_LABELS,
  deleteGroup,
  fetchGroup,
  updateGroup,
  type GroupDetail,
  type GroupFormat,
} from '@/lib/groups';
import { fetchSystems, type ExperienceLevel, type System, type VttType } from '@/lib/profile';
import { cacheGet } from '@/lib/screen-cache';

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

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [timezone, setTimezone] = useState('UTC');

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
    if (!id) return;
    // se llega desde el hub con la mesa recién cargada: usar esa copia evita
    // la espera Y que un fetch tardío pise lo que el usuario ya haya tecleado
    // (solo el dueño edita su mesa, la caché no puede estar desfasada por otro)
    const cached = cacheGet<GroupDetail>(`group:${id}`);
    (cached ? Promise.resolve(cached) : fetchGroup(id))
      .then((g) => {
        setName(g.name);
        setImageUrl(g.image_url);
        setSystemId(g.system_id);
        setFormat(g.format);
        setDescription(g.description ?? '');
        setTimezone(g.timezone);
        setWeekday(g.session_weekday);
        setSlot(g.session_slot);
        setFrequency(g.frequency);
        setSeats(g.max_players);
        setExperience(g.experience_wanted);
        setCombatNarrative(g.style_combat_narrative);
        setSeriousHumor(g.style_serious_humor);
        setRoleplayWeight(g.style_roleplay_weight);
        setVtt(g.vtt);
        setDiscordInvite(g.discord_invite_url ?? '');
        setLoaded(true);
      })
      .catch(() => showAlert('Error', 'No se pudo cargar la mesa.'));
  }, [id]);

  const valid = name.trim().length > 0 && systemId !== null;

  const handleSave = async () => {
    if (!id || !session || !valid) return;
    setBusy(true);
    try {
      await updateGroup(
        id,
        {
          name: name.trim(),
          image_url: imageUrl,
          system_id: systemId,
          format,
          description: description.trim() || null,
          timezone,
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
      router.replace({ pathname: '/groups/[id]', params: { id } });
    } catch (error) {
      showAlert('No se pudo guardar', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return (
      <ThemedView style={[styles.container, styles.loading]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppHeader
            onBack={() =>
              router.canGoBack()
                ? router.back()
                : router.replace({ pathname: '/groups/[id]', params: { id: id! } })
            }
          />
          <ScreenTitle>✏️ Editar mesa</ScreenTitle>

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
            placeholderTextColor="rgba(255,255,255,0.35)"
          />

          <SectionLabel>Sistema</SectionLabel>
          <View style={styles.chipRow}>
            {systems.map((s) => (
              <Chip key={s.id} label={s.name} selected={systemId === s.id} onPress={() => setSystemId(s.id)} />
            ))}
          </View>

          <SectionLabel>Formato</SectionLabel>
          <View style={styles.chipRow}>
            {FORMATS.map((f) => (
              <Chip key={f.value} label={f.label} selected={format === f.value} onPress={() => setFormat(f.value)} />
            ))}
          </View>

          <SectionLabel>Descripción</SectionLabel>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
          />

          <SectionLabel>Día de sesión</SectionLabel>
          <View style={styles.chipRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Chip key={label} label={label} selected={weekday === index} onPress={() => setWeekday(weekday === index ? null : index)} />
            ))}
          </View>

          <SectionLabel>Franja</SectionLabel>
          <View style={styles.chipRow}>
            {SLOT_LABELS.map((label, index) => (
              <Chip key={label} label={label} selected={slot === index} onPress={() => setSlot(slot === index ? null : index)} />
            ))}
          </View>

          <SectionLabel>Frecuencia</SectionLabel>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((f) => (
              <Chip key={f} label={f} selected={frequency === f} onPress={() => setFrequency(f)} />
            ))}
          </View>

          <SectionLabel>Límite de jugadores (sin contarte)</SectionLabel>
          <View style={styles.chipRow}>
            {SEAT_OPTIONS.map((n) => (
              <Chip key={n} label={String(n)} selected={seats === n} onPress={() => setSeats(n)} />
            ))}
          </View>

          <SectionLabel>Experiencia buscada</SectionLabel>
          <View style={styles.chipRow}>
            {EXPERIENCE_OPTIONS.map((option) => (
              <Chip key={option.label} label={option.label} selected={experience === option.value} onPress={() => setExperience(option.value)} />
            ))}
          </View>

          <SectionLabel>Estilo de la mesa</SectionLabel>
          <StyleAxis left="Combate" right="Narrativo" value={combatNarrative} onChange={setCombatNarrative} />
          <StyleAxis left="Serio" right="Humor" value={seriousHumor} onChange={setSeriousHumor} />
          <StyleAxis left="Roleo ligero" right="Roleo pesado" value={roleplayWeight} onChange={setRoleplayWeight} />

          <SectionLabel>Mesa virtual</SectionLabel>
          <View style={styles.chipRow}>
            {(Object.keys(VTT_LABELS) as VttType[]).map((value) => (
              <Chip key={value} label={VTT_LABELS[value]} selected={vtt === value} onPress={() => setVtt(value)} />
            ))}
          </View>

          <SectionLabel>Invitación a vuestro Discord</SectionLabel>
          <TextInput
            style={styles.input}
            value={discordInvite}
            onChangeText={setDiscordInvite}
            placeholder="https://discord.gg/…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            autoCapitalize="none"
          />

          <View style={styles.nav}>
            <OutlineButton label="Cancelar" tone="white" onPress={() => router.back()} disabled={busy} style={styles.cancelButton} />
            <PrimaryButton label={busy ? 'Guardando…' : '💾 Guardar cambios'} onPress={handleSave} disabled={!valid || busy} style={styles.saveButton} />

            <OutlineButton
              label="💥 Disolver la mesa"
              tone="red"
              disabled={busy}
              onPress={async () => {
                if (!id) return;
                const ok = await confirmAction(
                  '¿Disolver la mesa?',
                  'Se borran su chat, sesiones, votaciones e histórico, y todos los miembros la pierden. No se puede deshacer.',
                  'Sí, disolver'
                );
                if (!ok) return;
                const sure = await confirmAction(
                  'Última confirmación',
                  'La mesa y todo lo suyo desaparecen para siempre.',
                  'Disolver la mesa'
                );
                if (!sure) return;
                try {
                  await deleteGroup(id);
                  showAlert('💥 Mesa disuelta', 'Gracias por las partidas.');
                  router.replace('/groups');
                } catch (error) {
                  showAlert(
                    'No se pudo disolver',
                    error instanceof Error ? error.message : String(error)
                  );
                }
              }}
            />
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
  loading: {
    alignItems: 'center',
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
    borderRadius: 14,
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
  saveButton: {
    flex: 2,
  },
});
