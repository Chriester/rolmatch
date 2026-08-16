// Política de privacidad — página PÚBLICA (sin sesión), requisito de la
// ficha de Google Play y del formulario Data Safety. El contenido refleja el
// inventario real de datos del barrido de lanzamiento (2026-08-16): si se
// añade un dato o un tercero nuevo, esta página se actualiza en la misma PR.

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ui';
import { MaxContentWidth, Rolder, RolderFonts, Spacing } from '@/constants/theme';

const ACTUALIZADA = '16 de agosto de 2026';
const CONTACTO = 'chrishernandezponce@gmail.com';

function H({ children }: { children: string }) {
  return <Text style={styles.h}>{children}</Text>;
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

function B({ children }: { children: string }) {
  return <Text style={styles.b}>{children}</Text>;
}

export default function PrivacidadScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <ScreenTitle>Política de privacidad</ScreenTitle>
          <Text style={styles.updated}>Última actualización: {ACTUALIZADA}</Text>

          <P>
            Roldr es una aplicación para encontrar grupo de rol de mesa y organizar partidas.
            La desarrolla un equipo independiente y no vive de tus datos: sin anuncios, sin
            venta de datos y sin rastreadores de terceros. Esta página explica, en claro, qué
            guardamos y por qué.
          </P>

          <H>Qué datos guardamos</H>
          <P>
            <B>Cuenta y perfil.</B> Email, alias, foto de perfil, biografía, zona horaria,
            disponibilidad semanal, preferencias de juego y, si decides darlos, género y año de
            nacimiento. Si entras con Discord o Google, recibimos de ellos tu identificador,
            nombre y avatar. Tu perfil (sin el email) es visible para otras personas usuarias.
          </P>
          <P>
            <B>Contenido que creas.</B> Mesas, personajes y sus hojas, mensajes de chat de mesa
            y privados, fotos que subes, entradas del diario de campaña, valoraciones de
            fiabilidad y reportes. Las fotos de perfil, de mesa y de personaje se sirven desde
            un almacenamiento público (cualquiera con el enlace puede verlas); las fotos de chat
            van a un almacenamiento privado con enlaces firmados. Si un GM activa la «crónica
            pública» de su campaña, esas entradas del diario (con el alias de quien las
            escribió) pasan a ser visibles sin cuenta.
          </P>
          <P>
            <B>Actividad.</B> Swipes, matches, asistencia a sesiones, experiencia (XP) y unos
            pocos eventos de uso propios (abrir la app, completar el registro, hacer swipe,
            compartir) que usamos para entender qué funciona. Se borran a los 90 días.
          </P>
          <P>
            <B>Técnico.</B> Tokens de notificaciones push del dispositivo y, si la app falla,
            un registro del error (se borra a los 30 días). Si buscas GIFs, el texto de tu
            búsqueda se envía al proveedor de GIFs para darte resultados.
          </P>

          <H>Para qué los usamos</H>
          <P>
            Para lo que ves: emparejarte con mesas y jugadores compatibles, chatear, organizar
            sesiones y avisarte por notificación de matches, mensajes y partidas. No hay
            perfilado publicitario ni cesión comercial de datos. No usamos tus datos para
            entrenar modelos de inteligencia artificial.
          </P>

          <H>Quién los procesa</H>
          <P>
            Trabajamos con proveedores que procesan datos por encargo nuestro: <B>Supabase</B>
            {' '}(base de datos, cuentas y almacenamiento), <B>Vercel</B> (web),{' '}
            <B>Expo y Google Firebase</B> (envío de notificaciones push — reciben el token del
            dispositivo y el contenido de la notificación, que puede incluir el alias de quien
            escribe y una vista previa del mensaje), <B>Brevo</B> (emails de acceso) y{' '}
            <B>KLIPY</B> (búsqueda de GIFs — recibe el texto que buscas). Si entras con Discord
            o Google, su tratamiento del login se rige por sus propias políticas.
          </P>

          <H>Cuánto tiempo</H>
          <P>
            Mientras tengas cuenta. Los eventos de uso se purgan a los 90 días y los registros
            de error a los 30. Al borrar tu cuenta se elimina tu perfil, tus fotos, tus
            mensajes, tus swipes y matches, tus tokens de push y tu analítica; las mesas que
            hayas creado se disuelven. Sobreviven, ya sin conexión contigo: el texto de las
            sugerencias que enviaste al buzón de la app y los extractos de mensajes que otras
            personas hubieran reportado (los necesita moderación).
          </P>

          <H>Tus derechos</H>
          <P>
            Puedes ver y editar tu perfil desde la propia app, y borrar tu cuenta entera en
            Opciones → «Eliminar mi cuenta» (efecto inmediato). También puedes pedirnos el
            borrado o una copia de tus datos escribiendo a {CONTACTO} desde el email de tu
            cuenta. Si estás en el Espacio Económico Europeo, tienes además los derechos del
            RGPD (acceso, rectificación, supresión, oposición y portabilidad) y puedes
            reclamar ante tu autoridad de protección de datos.
          </P>

          <H>Edad mínima</H>
          <P>Roldr es para mayores de 16 años. No creamos cuentas por debajo de esa edad.</P>

          <H>Cambios y contacto</H>
          <P>
            Si esta política cambia de forma relevante, lo anunciaremos en la app. Dudas o
            solicitudes: {CONTACTO}.
          </P>
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
  updated: {
    color: Rolder.textTertiary,
    fontSize: 12.5,
    fontFamily: RolderFonts.regular,
    marginBottom: Spacing.two,
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
  b: {
    color: Rolder.text,
    fontFamily: RolderFonts.semibold,
    fontWeight: '600',
  },
});
