# Diseño UX del feed de swipe (barrido "feel Tinder")

Referencia de producto: **Tinder**, adaptado a mesas de rol. Este documento fija qué
significa eso en concreto para poder evaluar el resultado sin dar vueltas.

## Principios

1. **La foto es la protagonista.** La tarjeta es una imagen a sangre completa con la
   información superpuesta abajo sobre un degradado oscuro. Nunca "foto arriba, texto
   debajo en caja".
2. **El gesto es el producto.** Arrastrar la tarjeta debe sentirse físico: sigue al
   dedo/ratón, rota proporcionalmente al desplazamiento horizontal (±12°), y al soltar
   o vuelve con muelle o sale volando. Los botones disparan la misma animación.
3. **Feedback inmediato y legible.** Sellos «ME INTERESA» (verde, rotado, arriba-izq.)
   y «PASO» (rojo, arriba-dcha.) cuya opacidad crece con el arrastre. El umbral de
   decisión es ~35 % del ancho o velocidad alta.
4. **Siempre hay una tarjeta siguiente.** La siguiente tarjeta asoma detrás (escala
   0.95, y crece hasta 1 mientras la de arriba se va). Sin pantallas en blanco entre
   swipes.
5. **La información esencial cabe en un vistazo**; el resto vive en un panel de
   detalles que se abre con «ⓘ» (descripción, estilo, vitrina, reportar/bloquear).
   La tarjeta no scrollea.
6. **El match es un momento.** Overlay a pantalla completa («🎲 ¡Es un match!») con
   las dos fotos, no un alert del navegador.

## Anatomía de la tarjeta

```
┌──────────────────────────┐
│ [87 %]           (badge) │  ← compatibilidad, arriba-dcha, pill translúcida
│                          │
│      FOTO A SANGRE       │  ← o fallback: degradado de marca + emoji grande
│                          │
│ ▒▒▒ degradado oscuro ▒▒▒ │
│ Nombre grande y bold     │  ← mesa o alias
│ Sistema · formato · fr.  │  ← una línea, secundaria
│ 📅 Sábado tarde (Madrid) │  ← una línea, horario
│ 💘 badge like/propuesta  │  ← solo candidatos que ya dieron like
│                      ⓘ  │  ← abre panel de detalles
└──────────────────────────┘
       ( ✕ )      ( ♥ )       ← botones circulares 64px, borde rojo / relleno verde
```

- Ancho máx. 420 px (web centrada); esquinas 20 px; la tarjeta ocupa todo el alto
  disponible entre cabecera y botones.
- Fallback sin foto: degradado del color de marca (#5865F2 → #2A2D43) con un emoji
  grande (🎲 mesas, 🧙 jugadores) — nunca un hueco gris.

## Flujos

- **Jugador → mesas** (`/feed`): swipe dcha = me interesa, izq = paso. Si el jugador
  tiene personajes «buscando mesa», una tira compacta de chips entre tarjeta y botones
  permite proponer uno (opcional, se resetea por tarjeta).
- **GM → candidatos** (`/groups/[id]/candidates`): igual; los que ya dieron like van
  primero y llevan badge «💘 Le gustáis» + personaje propuesto.
- **Match**: overlay con ambas fotos, botones «Ver mis matches» y «Seguir buscando».
- **Fin del mazo / error**: estado centrado con emoji, mensaje y acción (reintentar /
  ajustar perfil), con el mismo cuidado visual.

## Implementación

- Gestos: `react-native-gesture-handler` (`Gesture.Pan`) + `react-native-reanimated`
  (shared values, springs, `interpolate`). Nada de librerías de deck de terceros:
  control total del feel. `GestureHandlerRootView` en el layout raíz.
- La tarjeta superior se monta con `key` por item: cada tarjeta estrena sus shared
  values y no hay flashes al avanzar.
- Componentes en `src/components/swipe/`: `deck` (física + stack + sellos + ref
  `swipe(dir)` para los botones), `card-shell` (foto/fallback/degradado), `action-bar`,
  `match-overlay`. Las pantallas solo componen.
- Parámetros del feel (ajustables en `deck.tsx`): rotación máx 12°, umbral 35 % del
  ancho, velocidad de salida 250 ms, muelle de vuelta `damping 15 / stiffness 150`.
