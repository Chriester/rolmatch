---
name: swipe-feel
description: Arquitectura y física del feed de swipe estilo Tinder de RolMatch. Usar al tocar src/components/swipe/*, la pantalla principal (index) o candidatos, o cualquier animación de tarjetas.
---

# Feed de swipe (feel Tinder)

Especificación de UX acordada con el usuario: `docs/diseno-swipe.md`.
Leerla antes de cambiar comportamiento — el feel se iteró en vivo y cada
decisión (rigidez, ejes, tira) responde a feedback explícito.

## Arquitectura (src/components/swipe/)
- `deck.tsx` — TODA la física. Parámetros del feel arriba del archivo:
  rotación 12°, umbral 35 %, fling 900, salida 260 ms, muelle horizontal
  rígido-con-baile, vertical SECO con timing (sin rebote, decisión del
  usuario), `AXIS_LOCK_DISTANCE 12` + `VERTICAL_BIAS 1.4` (bloqueo de eje:
  el primer movimiento decide; diagonales = like/pass).
- Tarjeta+descripción = **tira vertical de 2 alturas** con clipping: arrastrar
  arriba saca la tarjeta y deja la descripción (`renderDetails`/DetailsFace,
  contenido SIN scroll, recortar con numberOfLines). Nada de overlays.
- `card-cycle.tsx` — tap cicla jugador → personajes públicos → jugador
  (Gesture.Tap con maxDistance: arrastrar nunca dispara el tap). Dots arriba.
- `card-shell.tsx` — foto a sangre + degradado + fallback emoji (nunca gris).
- `match-overlay.tsx` — el match es un momento, no un alert.
- La tarjeta superior se monta con `key` por item (shared values frescos).

## Reglas duras
- NO añadir librerías de deck de terceros: control total del feel.
- `ReduceMotion.Never` en toda la física: el swipe es manipulación directa
  (el Windows del usuario tiene movimiento reducido y sin esto teletransporta).
- Salida de tarjeta: fuera de la PANTALLA (`Dimensions`), no solo del deck.
- Mutaciones de shared values en worklets disparan el falso positivo
  `react-hooks/immutability` → eslint-disable a nivel de archivo solo donde
  haya worklets de gesto.
- `Alert.alert` es no-op en web → usar siempre `showAlert` (src/lib/alert.ts).
- Botones (✕/♥/ⓘ) disparan las MISMAS animaciones vía deckRef
  (`swipe()`, `toggleDetails()`).

## Al ajustar el feel
Cambiar solo constantes de `deck.tsx`, una por iteración, y pedir al usuario
que lo sienta — no encadenar cambios a ciegas.
