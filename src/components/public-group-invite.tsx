// Lo que ve alguien SIN cuenta que abre un enlace de invitación. Antes esto
// era un muro de login: había que registrarse y rellenar cuatro pasos de
// perfil para saber si la mesa a la que te invitaban te interesaba siquiera.

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { CardChip, CardChipRow } from '@/components/swipe/card-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import {
  FORMAT_LABELS,
  SLOT_LABELS,
  WEEKDAY_LABELS,
  fetchPublicGroupCard,
  type PublicGroupCard,
} from '@/lib/groups';

export function PublicGroupInvite({ groupId }: { groupId: string }) {
  const [card, setCard] = useState<PublicGroupCard | null | undefined>(undefined);

  useEffect(() => {
    fetchPublicGroupCard(groupId)
      .then(setCard)
      .catch(() => setCard(null));
  }, [groupId]);

  const goToLogin = () => {
    // el destino se restaura al volver del login (ver _layout)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('rolder-ruta-pendiente', `/groups/${groupId}?invitacion=1`);
    }
    router.replace('/login');
  };

  if (card === undefined) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (card === null) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <Text style={styles.emoji}>🕯️</Text>
        <ThemedText style={styles.centerText}>
          Esta mesa ya no existe o se ha disuelto.
        </ThemedText>
        <PrimaryButton label="Ver otras mesas" onPress={goToLogin} />
      </ThemedView>
    );
  }

  const free = Math.max(card.max_players - card.taken_seats, 0);
  const schedule =
    card.session_weekday !== null && card.session_slot !== null
      ? `${WEEKDAY_LABELS[card.session_weekday]} · ${SLOT_LABELS[card.session_slot]}`
      : 'Horario por definir';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <AppHeader right={<View />} />

          <Text style={styles.invite}>Te han invitado a una mesa</Text>

          {card.image_url && (
            <Image source={{ uri: card.image_url }} style={styles.hero} contentFit="cover" />
          )}
          <ThemedText type="title">{card.name}</ThemedText>

          <CardChipRow>
            {card.system_name && <CardChip label={card.system_name} />}
            <CardChip label={FORMAT_LABELS[card.format]} />
            <CardChip label={schedule} />
            {card.frequency && <CardChip label={card.frequency} />}
          </CardChipRow>

          {card.description && <Text style={styles.description}>{card.description}</Text>}

          <View style={styles.metaBox}>
            <Text style={styles.meta}>
              🧙 Dirige {card.owner_alias ?? 'un GM'}
            </Text>
            <Text style={styles.meta}>
              {free > 0
                ? `🪑 ${free} ${free === 1 ? 'plaza libre' : 'plazas libres'} de ${card.max_players}`
                : '🪑 Sin plazas libres ahora mismo'}
            </Text>
          </View>

          <PrimaryButton label="Entrar y pedir sitio 🎲" onPress={goToLogin} />
          <ThemedText type="small" style={styles.footnote}>
            Necesitas una cuenta para pedir sitio. Se tarda un minuto y te sirve para todas las
            mesas.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: 24 },
  centerText: { textAlign: 'center' },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, width: '100%' },
  content: { flex: 1, padding: 20, gap: Spacing.three },
  emoji: { fontSize: 40 },
  invite: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hero: { width: '100%', height: 170, borderRadius: 18 },
  description: { color: Rolder.textSecondary, fontSize: 14, lineHeight: 21 },
  metaBox: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    gap: Spacing.one,
  },
  meta: { color: '#fff', fontSize: 14 },
  footnote: { textAlign: 'center' },
});
