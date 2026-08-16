# Data Safety de Google Play — borrador para la Console

Respuestas preparadas para el formulario (Play Console → Política de la app →
Seguridad de los datos), basadas en el inventario real del barrido de
lanzamiento (2026-08-16). Si se añade un dato o un tercero nuevo, actualizar
esto y el formulario a la vez. La política pública vive en
`https://rolmatch.vercel.app/privacidad` (esa URL va también en la ficha).

## Preguntas generales

- **¿Recoge o comparte datos de usuario?** Sí.
- **¿Todos los datos se cifran en tránsito?** Sí (HTTPS en todo: Supabase,
  Expo Push, KLIPY, Brevo).
- **¿Ofrece una vía para solicitar el borrado de datos?** Sí — borrado
  in-app (Opciones → Eliminar mi cuenta) y web
  `https://rolmatch.vercel.app/eliminar-cuenta`.

## Datos que se RECOGEN (collected)

Marcar «Recogido», NO «Compartido», salvo donde se indique. Nada se usa para
publicidad. Ningún dato se «vende».

| Categoría Play | Tipo | Obligatorio | Finalidad a marcar |
|---|---|---|---|
| Información personal → Nombre | Alias público | Sí | Funcionalidad de la app |
| Información personal → Dirección de correo | Email de la cuenta | Sí | Funcionalidad, gestión de cuenta |
| Información personal → IDs de usuario | UUID propio + ID de Discord/Google | Sí | Funcionalidad, gestión de cuenta |
| Información personal → Otra info | Género y año de nacimiento (opcionales), zona horaria, disponibilidad | No | Funcionalidad (matching) |
| Fotos y vídeos → Fotos | Avatar, fotos de mesa/personaje/diario/chat | No | Funcionalidad |
| Mensajes → Mensajes dentro de la app | Chat de mesa y DMs | Sí (núcleo) | Funcionalidad |
| Actividad en la app → Interacciones | Swipes, matches, RSVP, valoraciones, XP | Sí | Funcionalidad |
| Actividad en la app → Otras acciones | 7 eventos de uso propios (retención 90 días) | Sí | Analítica |
| Historial de búsqueda | Texto de búsqueda de GIFs | No | Funcionalidad. **También «Compartido»: va a KLIPY (proveedor de GIFs) para servir resultados** |
| Información y rendimiento → Registros de fallos | Mensaje + stack (30 días) | Sí | Analítica (diagnóstico) |
| Identificadores del dispositivo | Token de push (Expo/FCM) | No (solo si aceptas push) | Funcionalidad |

## Datos que NO se recogen (por si la Console pregunta)

Ubicación (ni aproximada), contactos, SMS/llamadas, audio, salud, info
financiera, historial web, apps instaladas, calendario. Sin SDKs de
publicidad ni analítica de terceros (la analítica es propia, en nuestra BD).

## Terceros (procesadores por encargo — no cuentan como «sharing» salvo KLIPY)

- **Supabase**: BD, auth, storage, functions (procesador principal).
- **Expo Push → Firebase Cloud Messaging (Google)**: token del dispositivo +
  contenido de la notificación (alias del emisor, preview del mensaje).
- **Brevo**: email de acceso (magic link / confirmación).
- **Vercel**: hosting web y tarjetas OG.
- **KLIPY**: recibe el texto de búsqueda de GIFs directamente desde el
  dispositivo (con IP) → declarar la categoría «Historial de búsqueda» como
  compartida con este proveedor.
- **Discord / Google (OAuth)**: proveedores de identidad al hacer login.

## Notas para la review

- Cuenta de prueba para «App access»: la cuenta QA (email y contraseña en el
  gestor privado de Chris — NO escribirlos aquí; es premium permanente).
- UGC: hay reporte in-app, bloqueo de usuarios y bandeja de moderación.
- Edad mínima 16 (validada en el registro).
- Sin anuncios. Premium solo por código promocional (sin compras in-app hoy).
