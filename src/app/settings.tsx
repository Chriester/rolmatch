// Opciones: cajón de ajustes y utilidades — ver el tutorial otra vez,
// canjear códigos promocionales… Todo lo que no es una sección de contenido
// acabará viviendo aquí.

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { ThemedView } from '@/components/themed-view';
import { ListRow, ScreenBlurb, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';

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
];

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <AppHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <ScreenTitle>⚙️ Opciones</ScreenTitle>
          <ScreenBlurb>Ajustes y utilidades de tu cuenta.</ScreenBlurb>

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
  version: {
    color: Rolder.textTertiary,
    fontSize: 12,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
