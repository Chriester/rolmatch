// Lo que ve alguien SIN cuenta que abre un enlace de invitación. Antes esto
// era un muro de login: había que registrarse y rellenar cuatro pasos de
// perfil para saber si la mesa a la que te invitaban te interesaba siquiera.

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react-native';
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
        <Flame color={Rolder.textTertiary} size={44} />
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

  // Una sola pieza que ES la invitación (entregable 2b): el hero dentro de
  // la tarjeta, GM y plazas como mini-tarjetas gemelas, y todo en un
  // viewport — cero razones para irse antes del botón.
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <AppHeader right={<View />} />

          <Text style={styles.invite}>Te han invitado a una mesa</Text>

          <View style={styles.card}>
            <View style={styles.hero}>
              {card.image_url ? (
                <Image
                  source={{ uri: card.image_url }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.heroFallback]}>
                  <Text style={styles.heroEmoji}>🎲</Text>
                </View>
              )}
              <View style={styles.heroScrim} />
              <Text style={styles.heroName} numberOfLines={2}>
                {card.name}
              </Text>
            </View>

            <View style={styles.cardBody}>
              <CardChipRow>
                {card.system_name && <CardChip label={card.system_name} />}
                <CardChip label={FORMAT_LABELS[card.format]} />
                <CardChip label={schedule} />
                {card.frequency && <CardChip label={card.frequency} />}
              </CardChipRow>

              {card.description && (
                <Text style={styles.description} numberOfLines={3}>
                  {card.description}
                </Text>
              )}

              <View style={styles.miniRow}>
                <View style={styles.miniCard}>
                  <Text style={styles.miniLabel}>Dirige</Text>
                  <Text style={styles.miniValue} numberOfLines={1}>
                    {card.owner_alias ?? 'un GM'}
                  </Text>
                </View>
                <View style={styles.miniCard}>
                  <Text style={styles.miniLabel}>Plazas</Text>
                  <Text style={styles.miniValue} numberOfLines={1}>
                    {free > 0 ? `${free} de ${card.max_players} libres` : 'Completa · pide sitio'}
                  </Text>
                </View>
              </View>

              <PrimaryButton label="Entrar y pedir sitio" onPress={goToLogin} />
              <ThemedText type="small" style={styles.footnote}>
                Se tarda un minuto y la cuenta te sirve para todas las mesas.
              </ThemedText>
            </View>
          </View>
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
  invite: {
    color: Rolder.violetSoft,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 20,
    overflow: 'hidden',
  },
  hero: {
    height: 150,
    justifyContent: 'flex-end',
  },
  heroFallback: {
    backgroundColor: 'rgba(199,125,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 44 },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,18,0.35)',
  },
  heroName: {
    color: '#fff',
    fontSize: 22,
    fontFamily: RolderFonts.bold,
    fontWeight: '800',
    padding: 14,
  },
  cardBody: {
    padding: 16,
    gap: Spacing.three,
  },
  description: { color: Rolder.textSecondary, fontSize: 13.5, lineHeight: 20 },
  miniRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  miniLabel: {
    color: Rolder.textTertiary,
    fontSize: 10.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  miniValue: {
    color: '#fff',
    fontSize: 13.5,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  footnote: { textAlign: 'center' },
});
