// Opciones: cajón de ajustes y utilidades — ver el tutorial otra vez,
// canjear códigos promocionales… Todo lo que no es una sección de contenido
// acabará viviendo aquí.

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmAction, showAlert } from '@/lib/alert';
import { deleteMyAccount } from '@/lib/auth';
import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, OutlineButton, ScreenBlurb, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { amIModerator } from '@/lib/moderation';
import { enableWebPush, webPushState, type WebPushState } from '@/lib/web-push';

const OPTIONS: { icon: string; label: string; detail: string; route: string }[] = [
  {
    icon: '🎓',
    label: 'Ver el tutorial',
    detail: 'El paseo de bienvenida por la app, las veces que quieras',
    route: '/tutorial',
  },
  {
    icon: '✨',
    label: 'Canjear código promocional',
    detail: 'Códigos de premium y regalos de la beta',
    route: '/promo',
  },
  {
    icon: '🚫',
    label: 'Bloqueados',
    detail: 'Quién no te ve ni te escribe, y cómo deshacerlo',
    route: '/blocked',
  },
];

// Estado del web push en frases que entienda cualquiera. Solo aparece en web:
// en el APK las notificaciones nativas ya van solas.
function WebPushSection() {
  const session = useSession();
  const [state, setState] = useState<WebPushState>(() => webPushState());
  const [busy, setBusy] = useState(false);

  if (state === 'unsupported') return null;

  return (
    <View style={styles.pushBox}>
      <Text style={styles.pushTitle}>🔔 Notificaciones</Text>
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
        <Text style={styles.pushDetail}>✅ Activadas en este dispositivo.</Text>
      ) : (
        <>
          <Text style={styles.pushDetail}>
            Avisos de matches, mensajes y sesiones aunque no tengas la app abierta.
          </Text>
          <OutlineButton
            label={busy ? 'Activando…' : '🔔 Activar notificaciones'}
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
      <Text style={styles.icon}>🛡️</Text>
      <View style={styles.body}>
        <Text style={styles.label}>Moderación</Text>
        <Text style={styles.detail}>La cola de reportes de la comunidad</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </ListRow>
  );
}

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <ScreenTitle>⚙️ Opciones</ScreenTitle>
          <ScreenBlurb>Ajustes y utilidades de tu cuenta.</ScreenBlurb>

          <WebPushSection />

          {OPTIONS.map((option) => (
            <ListRow key={option.label} onPress={() => router.push(option.route as never)}>
              <Text style={styles.icon}>{option.icon}</Text>
              <View style={styles.body}>
                <Text style={styles.label}>{option.label}</Text>
                <Text style={styles.detail}>{option.detail}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </ListRow>
          ))}

          <ModerationRow />

          <Pressable
            onPress={async () => {
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
  icon: {
    fontSize: 24,
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
