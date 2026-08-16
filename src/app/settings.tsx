// Opciones: cajón de ajustes y utilidades — ver el tutorial otra vez,
// canjear códigos promocionales… Todo lo que no es una sección de contenido
// acabará viviendo aquí.

import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dices, Shield } from 'lucide-react-native';
import { AppState, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmAction, showAlert } from '@/lib/alert';
import { deleteMyAccount } from '@/lib/auth';
import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, ScreenBlurb, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { track } from '@/lib/analytics';
import { APP_URL, SUPPORT_URL } from '@/lib/config';
import { fetchMyOwnedGroups } from '@/lib/groups';
import { nativePushState, registerPushToken, type NativePushState } from '@/lib/notifications';
import { amIModerator } from '@/lib/moderation';
import { fetchPremiumStatus, type PremiumStatus } from '@/lib/premium';
import { fetchSearching, setSearching } from '@/lib/profile';
import { shareLink } from '@/lib/share';
import { enableWebPush, webPushState, type WebPushState } from '@/lib/web-push';

const OPTIONS: { label: string; detail: string; route: string }[] = [
  {
    label: 'Ver el tutorial',
    detail: 'El paseo de bienvenida por la app, las veces que quieras',
    route: '/tutorial',
  },
  {
    label: 'Canjear código promocional',
    detail: 'Códigos de premium y regalos de la beta',
    route: '/promo',
  },
  {
    label: 'Enviar sugerencia',
    detail: 'Ideas y cosas que fallan, directas al equipo',
    route: '/feedback',
  },
  {
    label: 'Bloqueados',
    detail: 'Quién no te ve ni te escribe, y cómo deshacerlo',
    route: '/blocked',
  },
];

// Pausar la búsqueda (migr. 00048): dejar de salir en el feed de los GMs sin
// borrar nada. Si la columna aún no existe, la sección no aparece.
function SearchingSection() {
  const session = useSession();
  // undefined = cargando; null = migración sin aplicar (sección oculta)
  const [searching, setSearchingState] = useState<boolean | null | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    fetchSearching(session.user.id)
      .then(setSearchingState)
      .catch(() => setSearchingState(null));
  }, [session]);

  if (searching === undefined || searching === null) return null;

  const toggle = async (value: boolean) => {
    if (!session) return;
    setSearchingState(value); // optimista: un switch no puede ir con retardo
    try {
      await setSearching(session.user.id, value);
    } catch (error) {
      setSearchingState(!value);
      showAlert('No se pudo cambiar', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <View style={styles.pushBox}>
      <View style={styles.searchingRow}>
        <View style={styles.searchingText}>
          <Text style={styles.pushTitle}>En búsqueda de mesa</Text>
          <Text style={styles.pushDetail}>
            {searching
              ? 'Los GMs te ven entre los candidatos. Apágalo si ya tienes mesa: dejarás de salir en su feed (tus mesas y chats siguen igual).'
              : 'Pausado: no apareces en el feed de nadie. Enciéndelo cuando vuelvas a buscar.'}
          </Text>
        </View>
        <Switch
          value={searching}
          onValueChange={toggle}
          accessibilityLabel="En búsqueda de mesa"
          trackColor={{ true: Rolder.like, false: 'rgba(255,255,255,0.15)' }}
        />
      </View>
    </View>
  );
}

// Qué incluye premium y en qué estado está el tuyo. En la alpha nadie paga:
// el premium llega por código promocional (los testers lo tienen incluido).
const PREMIUM_PERKS: { label: string }[] = [
  { label: 'Rewind: deshaz el último swipe si te arrepientes' },
  { label: 'Encuentros al descubierto: ve quién te ha dado like antes de swipear' },
  { label: 'Boost: destaca tu mesa 7 días, la primera de los feeds' },
  { label: 'Temas premium para las hojas de personaje' },
];

function PremiumSection() {
  const session = useSession();
  const [status, setStatus] = useState<PremiumStatus | undefined>(undefined);

  // En cada focus, no solo al montar: al volver de canjear el código en
  // /promo la caja tiene que reflejar el premium recién activado.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      fetchPremiumStatus(session.user.id)
        .then(setStatus)
        .catch(() => setStatus({ active: false, until: null }));
    }, [session])
  );

  const until = status?.until;
  const untilLabel =
    until === 'infinity' || until == null
      ? 'para siempre'
      : `hasta el ${new Date(until).toLocaleDateString('es-ES')}`;

  return (
    <View style={styles.pushBox}>
      <Text style={styles.pushTitle}>Premium</Text>
      <Text style={styles.pushDetail}>
        {status?.active
          ? `Activo ${untilLabel}. Tienes desbloqueado:`
          : 'Qué desbloquea el premium de rolder:'}
      </Text>
      <View style={styles.perksList}>
        {PREMIUM_PERKS.map((perk) => (
          <View key={perk.label} style={styles.perkRow}>
            <Text style={[styles.pushDetail, styles.perkLabel]}>{perk.label}</Text>
          </View>
        ))}
      </View>
      {status !== undefined && !status.active && (
        <OutlineButton
          label="Canjear mi código de tester"
          onPress={() => router.push('/promo')}
        />
      )}
      {SUPPORT_URL && (
        <>
          <Text style={styles.pushDetail}>
            rolder es gratis y sin anuncios. Si te está encontrando mesa, puedes invitarnos a
            un café:
          </Text>
          <OutlineButton
            label="Apóyanos"
            onPress={() => SUPPORT_URL && Linking.openURL(SUPPORT_URL)}
          />
        </>
      )}
    </View>
  );
}

// Estado de las notificaciones NATIVAS (Android/iOS). Antes no existía
// ninguna vía en la app para reactivarlas tras un «No permitir» (el diálogo
// del sistema solo sale una o dos veces): esta caja enseña el estado real y
// da salida — pedir el permiso si aún se puede, o abrir Ajustes si no.
function NativePushSection() {
  const session = useSession();
  const [state, setState] = useState<NativePushState | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    nativePushState().then(setState).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // al volver de los Ajustes del sistema la app pasa a active: re-mirar
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  if (Platform.OS === 'web' || !state || state === 'unavailable') return null;

  return (
    <View style={styles.pushBox}>
      <Text style={styles.pushTitle}>Notificaciones</Text>
      {state === 'granted' ? (
        <Text style={styles.pushDetail}>Activadas en este dispositivo.</Text>
      ) : state === 'denied' ? (
        <>
          <Text style={styles.pushDetail}>
            Están bloqueadas a nivel de sistema, así que no podemos avisarte de matches,
            mensajes ni sesiones. Se reactivan en los ajustes de la app.
          </Text>
          <OutlineButton
            label="Abrir ajustes del sistema"
            onPress={() => Linking.openSettings().catch(() => {})}
          />
        </>
      ) : (
        <>
          <Text style={styles.pushDetail}>
            Avisos de matches, mensajes y sesiones aunque no tengas la app abierta.
          </Text>
          <OutlineButton
            label={busy ? 'Activando…' : 'Activar notificaciones'}
            disabled={busy || !session}
            onPress={async () => {
              if (!session) return;
              setBusy(true);
              try {
                await registerPushToken(session.user.id);
              } finally {
                setBusy(false);
                refresh();
              }
            }}
          />
        </>
      )}
    </View>
  );
}

// Estado del web push en frases que entienda cualquiera. Solo aparece en web
// (en nativo la caja de arriba cubre el permiso del sistema).
function WebPushSection() {
  const session = useSession();
  const [state, setState] = useState<WebPushState>(() => webPushState());
  const [busy, setBusy] = useState(false);

  if (state === 'unsupported') return null;

  return (
    <View style={styles.pushBox}>
      <Text style={styles.pushTitle}>Notificaciones</Text>
      {state === 'ios-install' ? (
        <Text style={styles.pushDetail}>
          Para recibir avisos de matches, mensajes y sesiones en iPhone/iPad: abre rolder en
          Safari, toca Compartir → «Añadir a pantalla de inicio» y entra desde el icono. El
          botón de activar aparecerá aquí.
        </Text>
      ) : state === 'denied' ? (
        <Text style={styles.pushDetail}>
          Las notificaciones están bloqueadas en este navegador. Actívalas en los ajustes del
          navegador para este sitio y recarga.
        </Text>
      ) : state === 'granted' ? (
        <Text style={styles.pushDetail}>Activadas en este dispositivo.</Text>
      ) : (
        <>
          <Text style={styles.pushDetail}>
            Avisos de matches, mensajes y sesiones aunque no tengas la app abierta.
          </Text>
          <OutlineButton
            label={busy ? 'Activando…' : 'Activar notificaciones'}
            disabled={busy || !session}
            onPress={async () => {
              if (!session) return;
              setBusy(true);
              try {
                setState(await enableWebPush(session.user.id));
              } catch (error) {
                showAlert(
                  'No se pudo activar',
                  error instanceof Error ? error.message : String(error)
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </View>
  );
}

/** Invitar a alguien a rolder (no a una mesa concreta): boca a boca puro. */
function ShareAppRow() {
  const session = useSession();
  return (
    <ListRow
      onPress={async () => {
        const via = await shareLink({
          title: 'rolder — encuentra tu mesa de rol',
          text: 'Estoy en rolder buscando gente para jugar rol 🎲 Échale un ojo:',
          url: APP_URL,
        });
        if (!via) return;
        if (via === 'clipboard')
          showAlert('Enlace copiado', 'Pégalo donde quieras para invitar a alguien a rolder.');
        track(session?.user.id, 'share_app', { via });
      }}>
      <Dices color={Rolder.violetSoft} size={20} strokeWidth={2} />
      <View style={styles.body}>
        <Text style={styles.label}>Invitar a rolder</Text>
        <Text style={styles.detail}>Comparte la app con quien le falte mesa (o jugadores)</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </ListRow>
  );
}

/** La bandeja de moderación solo existe para quien modera. */
function ModerationRow() {
  const session = useSession();
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    if (!session) return;
    amIModerator(session.user.id).then(setIsModerator);
  }, [session]);

  if (!isModerator) return null;
  return (
    <ListRow onPress={() => router.push('/moderation')}>
      <Shield color={Rolder.violetSoft} size={20} strokeWidth={2} />
      <View style={styles.body}>
        <Text style={styles.label}>Moderación</Text>
        <Text style={styles.detail}>La cola de reportes de la comunidad</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </ListRow>
  );
}

export default function SettingsScreen() {
  const session = useSession();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <ScreenTitle>Opciones</ScreenTitle>
          <ScreenBlurb>Ajustes y utilidades de tu cuenta.</ScreenBlurb>

          <SearchingSection />
          <NativePushSection />
          <WebPushSection />
          <PremiumSection />

          {OPTIONS.map((option) => (
            <ListRow key={option.label} onPress={() => router.push(option.route as never)}>
              <View style={styles.body}>
                <Text style={styles.label}>{option.label}</Text>
                <Text style={styles.detail}>{option.detail}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </ListRow>
          ))}

          <ShareAppRow />
          <ModerationRow />

          <Pressable
            onPress={async () => {
              // Si es GM de mesas con gente, el borrado las disuelve para
              // TODOS: eso merece un aviso con nombres, no la frase genérica.
              const owned = session
                ? await fetchMyOwnedGroups(session.user.id).catch(() => [])
                : [];
              const withPeople = owned.filter((g) => g.members > 0);
              if (withPeople.length > 0) {
                const names = withPeople
                  .map((g) => `«${g.name}» (${g.members === 1 ? '1 persona' : `${g.members} personas`})`)
                  .join(', ');
                const proceed = await confirmAction(
                  'Tus mesas se disuelven',
                  `Eres GM de ${names}. Al borrar tu cuenta, esas mesas desaparecen para todos sus miembros: chat, diario y calendario. Puedes traspasarlas antes desde la ficha de cada mesa («Traspasar mesa»).`,
                  'Continuar igualmente'
                );
                if (!proceed) return;
              }
              const ok = await confirmAction(
                '¿Eliminar tu cuenta?',
                'Se borran tu perfil, personajes, mesas, chats y todo lo demás. No se puede deshacer.',
                'Sí, eliminar todo'
              );
              if (!ok) return;
              const sure = await confirmAction(
                'Última confirmación',
                'De verdad de la buena: esto elimina tu cuenta para siempre.',
                'Eliminar mi cuenta'
              );
              if (!sure) return;
              try {
                await deleteMyAccount();
                router.replace('/login');
              } catch (error) {
                showAlert(
                  'No se pudo eliminar',
                  error instanceof Error ? error.message : String(error)
                );
              }
            }}>
            <Text style={styles.deleteAccount}>Eliminar mi cuenta</Text>
          </Pressable>

          <Text style={styles.version}>
            rolder {Constants.expoConfig?.version ?? ''} · hecho con 🎲 en la comunidad
          </Text>
        </View>
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
    width: '100%',
  },
  content: {
    flex: 1,
    padding: 20,
    gap: Spacing.three,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  detail: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
  },
  chevron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 22,
  },
  pushBox: {
    backgroundColor: Rolder.surface,
    borderWidth: 1,
    borderColor: Rolder.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    gap: Spacing.two,
  },
  pushTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
  pushDetail: {
    color: Rolder.textSecondary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
    lineHeight: 18,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  perksList: {
    gap: 6,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  // el cuerpo del texto lo pone pushDetail (composición en el JSX)
  perkLabel: {
    flex: 1,
  },
  searchingText: {
    flex: 1,
    gap: Spacing.two,
  },
  deleteAccount: {
    color: Rolder.pass,
    fontSize: 13,
    fontFamily: RolderFonts.semibold,
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  version: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
