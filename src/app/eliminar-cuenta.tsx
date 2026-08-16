// Página PÚBLICA de solicitud de borrado de cuenta — requisito de Google
// Play para apps con creación de cuenta: debe existir una URL accesible sin
// la app donde iniciar el borrado. La vía principal sigue siendo in-app.

import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutlineButton, ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';

const CONTACTO = 'chrishernandezponce@gmail.com';

export default function EliminarCuentaScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <ScreenTitle>Eliminar tu cuenta de Roldr</ScreenTitle>

          <Text style={styles.h}>Desde la app (inmediato)</Text>
          <Text style={styles.p}>
            Entra en Roldr → Perfil → Opciones → «Eliminar mi cuenta». El borrado es
            inmediato y definitivo: desaparecen tu perfil, tus fotos, tus mensajes, tus
            personajes, tus matches y tus datos de uso. Si diriges mesas, se disuelven para
            todos sus miembros (puedes traspasarlas antes desde la ficha de cada mesa).
          </Text>

          <Text style={styles.h}>Sin la app (por email)</Text>
          <Text style={styles.p}>
            Si ya no tienes la app instalada o no puedes entrar, escríbenos desde el email con
            el que te registraste y borramos la cuenta por ti en un plazo máximo de 7 días.
            Indica en el asunto «Eliminar cuenta».
          </Text>
          <OutlineButton
            label="Escribir para eliminar mi cuenta"
            onPress={() =>
              Linking.openURL(
                `mailto:${CONTACTO}?subject=${encodeURIComponent('Eliminar cuenta')}`
              ).catch(() => {})
            }
          />
          <Text style={styles.small}>{CONTACTO}</Text>

          <Text style={styles.h}>Qué se conserva</Text>
          <Text style={styles.p}>
            Tras el borrado no queda ningún dato asociado a ti. Solo sobreviven, anonimizados:
            el texto de las sugerencias que enviaste al buzón de la app y los extractos de
            mensajes que otras personas hubieran reportado a moderación. Los registros técnicos
            de error se purgan solos a los 30 días.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Rolder.page,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
  },
  h: {
    color: '#fff',
    fontSize: 16,
    fontFamily: RolderFonts.extrabold,
    fontWeight: '800',
    marginTop: Spacing.three,
  },
  p: {
    color: Rolder.textSecondary,
    fontSize: 14,
    fontFamily: RolderFonts.regular,
    lineHeight: 21,
  },
  small: {
    color: Rolder.textTertiary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
    textAlign: 'center',
  },
});
