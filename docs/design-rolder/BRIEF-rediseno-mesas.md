# Brief de rediseño — pantallas de mesa de rolder

## Qué es rolder

App de matchmaking para grupos de rol de mesa online en español, estilo
Tinder: los jugadores swipean mesas y los GMs swipean candidatos; el match
mete al jugador en la mesa. La **mesa** es la entidad central del producto:
tiene ficha, chat, calendario de partidas con votaciones, diario de campaña
y bandeja de candidatos. Estado: alpha con ~15 testers, preparando beta.
React Native + Expo (una sola base para iOS/Android/web), tema oscuro único,
UI 100 % en español.

## Qué se pide

Rediseño (o crítica + propuestas) de las pantallas de mesa adjuntas.
Objetivo: subir el nivel visual y de jerarquía manteniendo la identidad.
Se aceptan tanto retoques como replanteamientos de layout, pero:

- Proponer **dentro del design system** (tokens abajo) o justificar cada
  evolución de token. Nada de tema claro: la app es dark-only por identidad.
- Debe seguir siendo implementable en React Native con estilos planos
  (nada de blur/filtros CSS complejos; degradados lineales sí, vía
  expo-linear-gradient).
- Mobile-first 420 px de ancho lógico; en web el contenido se centra con
  ancho máximo 480.
- El tono verbal es cercano y jugón («¿Seguís jugando?», «Pifia crítica»),
  nunca corporativo. Mantenerlo en cualquier texto que se proponga.

## Design system actual (resumen)

- **Color**: fondo página `#0B0B12` · superficie `#16161F` · borde
  superficie `rgba(255,255,255,0.08)` · violeta marca `#8B6CFF` (suaves
  `#B9A6FF` / `#CBBAFF`) · coral/pass `#FF5A5F` · verde like `#3BD16F` ·
  oro premium `#F5A623` · texto `rgba(255,255,255,0.85)` con secundario y
  terciario en blancos rebajados. Gradiente de marca coral→violeta;
  gradiente de acción verde.
- **Tipografía**: Sora (400/600/700/800) para todo; Nunito Black solo para
  los sellos de swipe (¡CRÍTICO!/PIFIA).
- **Primitivas existentes**: ScreenTitle, ScreenBlurb, SectionLabel
  (11px/700 uppercase violeta), PrimaryButton (gradiente verde),
  OutlineButton (tonos violeta/blanco/rojo/oro), ListRow, StatusPill,
  StyleBar (sliders de estilo), CardShell/CardChip (tarjetas del feed),
  calendar-picker propio.
- Esquinas 16-20 px, tarjetas sobre `surface` con borde sutil.

## Las pantallas (capturas adjuntas, estado real actual)

| Fichero | Pantalla | Notas y estados no capturados |
|---|---|---|
| `mesas-tarjeta-feed.png` | Tarjeta de mesa en el feed de swipe | El deck es sagrado (física iterada a mano); el rediseño puede tocar el CONTENIDO de la tarjeta, no el gesto. |
| `mesas-lista.png` | «Mis mesas» (pestaña) | Capturada vacía; con mesas usa filas con miniatura + pill ACTIVA/INACTIVA. |
| `mesas-crear.png` | Crear mesa (formulario largo) | El mismo formulario sirve para editar. Campos: nombre, foto, sistema, formato, descripción, horario, frecuencia, experiencia, 3 sliders de estilo, VTT, plazas. |
| `mesas-editar-mesa.png` | Editar mesa | Variante del anterior con datos. |
| `mesas-ficha-gm.png` | Ficha de mesa — vista del GM | La pantalla más importante. Hero con foto/gradiente, chips, 4 accesos (chat/agenda/diario/candidatos), descripción, horario, PLAZAS (avatares + libres invitables), estilo, botones de GM (traspasar, destacar/boost premium en oro). No capturado: banner ámbar «¿Seguís jugando?» (mesa inactiva 28 días) y banner «Mesa archivada» con reabrir. |
| `mesas-ficha-visitante.png` | Ficha — visitante con sesión (no miembro) | Cambian los CTA: «Pedir sitio» en vez de acciones de GM. |
| `mesas-ficha-publica.png` | Ficha pública sin sesión (enlace compartido) | Tarjeta de invitación mínima + CTA de registro. Es la landing del motor de crecimiento nº 1 (compartir enlace). |
| `mesas-candidatos.png` | Bandeja de candidatos (GM) | Capturada vacía; con gente son tarjetas swipeables de candidato. |
| `mesas-chat-mesa.png` | Chat de la mesa | Capturado vacío; con mensajes: burbujas, reacciones, fotos, dados (tiradas), gifs. |
| `mesas-agenda.png` | Organizar partida (calendario + votaciones) | Capturada vacía. Flujo real: GM propone fechas en calendario → miembros votan → GM fija → confirmaciones de asistencia. Tiene guía de primeros pasos (overlay de 4 pasos). |
| `mesas-diario.png` | Diario de campaña | Entradas cronológicas por partida jugada. |

## Restricciones de producto que el rediseño debe respetar

- Las plazas son finitas (`max_players`) y se enseñan como huecos: la
  sensación de «quedan 2 sitios» es deliberada y funciona.
- El boost premium (oro) debe seguir siendo visible pero no invasivo.
- La ficha pública no puede enseñar más datos de los que enseña (privacidad:
  sin lista de miembros).
- Accesibilidad: contraste AA sobre los fondos oscuros, targets táctiles
  ≥44 px, y todo control con label.

## Entregable ideal

Por pantalla: qué conservar, qué cambiar y por qué, con mockup o descripción
implementable. Si se proponen componentes nuevos, definirlos una vez y
reutilizarlos entre pantallas (irán al design system). Prioridad si hay que
elegir: ficha de mesa (3 variantes) > tarjeta del feed > agenda > crear/editar.
