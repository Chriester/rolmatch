# Adopción del sistema de diseño Roldr — plan por fases

**Contexto.** La diseñadora ha entregado `docs/Roldr Design System/`: tokens de color
(carmesí `#B01B5E` → ciruela → violeta, lila `#C77DFF` como acento), tipografía
(Outfit / Manrope / JetBrains Mono), guías de gradiente, iconografía (Lucide, cero
emoji en la UI), motion, estados y reglas de copy en español. El logo Roldr **ya está
en producción** desde el arte v3 (PR #187); esto es la capa de sistema que va detrás.

**Principios del plan** (los del proyecto): por focos, PRs pequeñas, `qa-visual`
antes de cada merge, OTA siempre que se pueda y lo nativo agrupado en un solo build.
El sistema entregado es web (JSX + CSS custom properties): en la app **se traduce a
`theme.ts` y primitivas RN, no se copia**.

---

## Fase 0 — Decisiones y cimientos

Sin código de producto. Desbloquea todo lo demás.

1. Confirmar que **Roldr es el nombre final** → activa el bloque «Esperando a la
   estrategia de marca» de `pendientes.md` (PRD/AGENTS, dominio).
2. Pedir a la diseñadora los **5 ficheros de export** que el PDF nombra
   (`roldr-colors.css`, `.tokens.json`, `tailwind.roldr.js`, `Roldr.swift`,
   `colors.xml`): si existen, mandan sobre `tokens/colors.css`.
3. Registrar la carpeta como **skill del proyecto** (`roldr-design`) para material de
   marketing — útil YA para la ficha de Play Store y Ko-fi (brief de la PR #190).

**Problema: el repo es público y la carpeta incluye el PDF original y los logos.**
- Opción A — pedirle OK y commitear todo (más simple, historial completo).
- Opción B — commitear todo salvo el PDF (queda fuera con una línea de gitignore).
- Opción C — no commitearla; vive local + en el drive, la skill apunta a la ruta.
- **Recomendación: A si dice que sí; B si duda.** C rompe el flujo de dos personas.

## Fase 1 — Piel de color (tokens) · el mayor impacto visual por línea de código

Traducir los roles semánticos a `theme.ts` (un solo archivo concentra casi todo):

| Rol Roldr | Valor | Sustituye en `Rolder.*` |
|---|---|---|
| `--bg` | `#0A090C` | `page #0B0B12` |
| `--surface` / `--surface-raised` | `#131119` / `#1D1926` | `surface` / `input` |
| `--border` | `#2E2839` | `surfaceBorder` |
| `--text` / `--text-muted` / `--text-disabled` | `#F5F2F8` / `#A39BB4` / `#544D63` | blancos y `textSecondary/Tertiary` |
| `--accent` / `--link` (lila) | `#C77DFF` | `violet #8B6CFF` en textos y links |
| gradiente de marca 100° | carmesí→ciruela→violeta | `brandGradient` coral→violeta |
| `--success` / `--warning` / `--danger` | `#3FBF8F` / `#E8A44C` / `#E5484D` | `like` / — / `coral/pass` |
| chips alpha lila 12/28/40/60 | — | fondos y bordes de Chip/CardChip |

**Problemas y opciones:**

- **P1 · El CTA primario hoy es verde** (`PrimaryButton` con gradiente verde) y el
  sistema dice: el gradiente de marca en **exactamente un CTA por pantalla**, y el
  verde queda solo para success/swipe-yes.
  - A — Adopción literal: `PrimaryButton` pasa al gradiente de marca; verde solo
    éxito. **Recomendada** (es la identidad), barriendo pantalla a pantalla para
    respetar el «uno por pantalla».
  - B — Transitoria: paleta nueva en fondos/textos/chips, CTAs verdes hasta la
    fase 4. Menos rotura, identidad a medias durante semanas.
- **P2 · El violeta actual como texto muere** (el propio handoff: 2,9:1 de
  contraste). Todo `violetSoft`/`violet` en texto pasa a lila. Solución: auditoría
  con grep + `qa-visual`; es mecánico pero hay que mirarlo pantalla a pantalla.
- **P3 · Hexes hardcodeados fuera de `theme.ts`** (fallbacks de tarjetas
  `#4A55E2/#8B6CFF`, `#5865F2`, gradientes sueltos). Solución: grep de `#[0-9A-F]`
  en `src/` y llevarlos a tokens en la misma PR.
- **P4 · Los cosméticos recién lanzados** (marcos «Arcano» violeta, «Oro», «Fuego de
  dragón» coral) están calibrados contra la paleta vieja. Solución: recalibrar los
  hex del catálogo (`lib/cosmetics.ts`) — los ids equipados no cambian, solo el
  color que pintan.

**Entrega:** 1-2 PRs. **OTA: sí.**

## Fase 2 — Tipografía

Sora → **Outfit** (display, 600-700, tracking −2%), cuerpo → **Manrope** (400-600),
y **JetBrains Mono** para notación de dados (`2d6+3`, `CD 15`) donde aparezca.
Los tres están en `@expo-google-fonts/*`.

**Problemas y opciones:**

- **P1 · Son sustituciones** — la diseñadora no entregó binarios. Si llegan los
  reales después, se cargan locales con `expo-font`; la estructura de
  `RolderFonts` no cambia. No bloquear la fase esperándolos.
- **P2 · Métricas distintas = layouts que se mueven** (líneas que parten distinto,
  botones más anchos, `numberOfLines` que ahora truncan). Solución: cambiar el
  mapping en `theme.ts`/`_layout.tsx` y hacer un `qa-visual` COMPLETO (todas las
  pantallas, no solo las tocadas); arreglos puntuales en la misma PR.
- **P3 · Los sellos ¡CRÍTICO!/PIFIA usan Nunito_900Black**, sin equivalente en el
  sistema. Opciones: (a) mantener Nunito como excepción deliberada de los sellos;
  (b) Outfit 700 uppercase con más tracking; (c) preguntárselo. **Recomendación:
  (c) con (a) como default** — los sellos son marca emocional del swipe.

**Entrega:** 1 PR + barrido de regresiones. **OTA: sí.**

## Fase 3 — Iconografía y política de emoji · la más invasiva

El sistema manda **Lucide** y **cero emoji en la UI** (solo en contenido escrito por
usuarios). La app hoy es emoji en todas partes: tabs, botones, chips, títulos,
pushes… y las features de retención recién mergeadas añadieron más.

- **Viabilidad técnica:** `lucide-react-native` monta sobre `react-native-svg`, que
  **ya es dependencia** → es JS puro, va por OTA, sin build nativo. (El truco de
  CSS-mask del sistema es solo web; en la app no aplica.)

**Problemas y opciones:**

- **P1 · Alcance enorme** (cientos de usos). Opciones:
  - A — Big-bang: una PR gigante. Descartada: imposible de revisar y de QA.
  - B — **Por capas, recomendada:** 1) chrome (tab bar, cabeceras, botones de
    acción), 2) chips y pills, 3) líneas de metadatos de tarjetas, 4) contenido.
  - C — **Pactar la frontera con la diseñadora, complementaria a B:** emoji
    permitido en «contenido con voz» (crónicas, cementerio 🪦, textos de usuario) y
    prohibido en chrome. La regla del sistema ya apunta ahí.
- **P2 · El `dices` es semántico** («unirse a mesa» = dado, no corazón): tocar la
  action bar del swipe es territorio de la skill `swipe-feel` — hacerlo como PR
  propia con su física intacta.
- **P3 · ¿Los pushes son UI?** Los títulos de notificación llevan emoji
  (`🎲 ¿Qué tal fue…`). En notificaciones el emoji rinde (destacan en la bandeja).
  **Recomendación: excepción explícita para pushes**, decidida con ella.

**Entrega:** 3-4 PRs por capas. **OTA: sí.**

## Fase 4 — Superficies, componentes y motion

Radios (12 botones/inputs · 16 cards · 24 tarjetas de swipe y sheets), hairline
`--border` + inset blanco 6% arriba, sombras casi-negras (nunca de color, salvo
`--glow-brand` bajo el CTA), chips SIEMPRE alpha, estados (press `scale(.97)`,
focus ring lila, disabled 40%), timings (90/140/220/320/420 ms) y el easing
`--ease-dice` reservado al dado y al match pop.

**Problemas y opciones:**

- **P1 · Blur** (cabecera, tab bar, scrim de sheets): `expo-blur` **no está
  instalado** y es módulo nativo → exige build de APK.
  - A — **Recomendada:** fondo `rgba(19,17,25,.86)` sólido ahora (OTA, y es el
    fallback que el propio sistema da) y blur real en el siguiente build nativo,
    agrupado con lo que caiga (skill `apk-y-ota`).
  - B — Blur solo en web (CSS `backdrop-filter`, gratis) y sólido en nativo.
  - C — Meter expo-blur ya y hacer build. Solo si hay otro motivo de build.
- **P2 · Mapeo de primitivas:** `ui.tsx` (PrimaryButton/OutlineButton/Chip/
  StatusPill→Badge/XpBar), `card-shell.tsx` (radio 24, scrim inferior como
  `--scrim-bottom`), sheets. Orden por focos: primitivas → tarjetas swipe →
  formularios → resto. Cada foco, su PR y su `qa-visual`.
- **P3 · Motion:** traducir a constantes Reanimated en un módulo de tokens de
  motion; la física del deck NO se toca (es `swipe-feel`, ya afinada) — solo
  curvas/duraciones de fades, sheets y chips.

**Entrega:** 3-4 PRs. **OTA: sí (con blur aplazado al build).**

## Fase 5 — Copy y microtexto

La guía de contenido: tuteo (ya se cumple), botones en infinitivo/primera persona
(«Unirme», «Pedir plaza» — nunca «Aceptar/OK»), sentence case (nada de Title Case),
UPPERCASE solo en badges/overlines, sin adjetivos hype, **una sola exclamación en
todo el producto** («¡Mesa encontrada!»), coma decimal, dados en mono.

**Problemas y opciones:**

- **P1 · Strings dispersos por toda la app** y sin i18n centralizado. Opciones:
  barrido pantalla a pantalla con la checklist (rápido, sin refactor), o
  centralizar strings primero (caro, y con un solo idioma no compra nada hoy).
  **Recomendación: barrido con checklist**, aprovechando los focos de la fase 4.
- **P2 · El copy actual es exclamativo** (pushes, celebraciones, misiones). Decidir
  con la diseñadora el registro de notificaciones (ver fase 3-P3) y dejar la
  exclamación única en el match.

**Entrega:** 1-2 PRs de barrido. **OTA: sí.**

## Fase 6 — Marca exterior y cierre

1. **Renombrar lo visible**: «rolder»/«RolMatch» → Roldr (login, `og:site_name`,
   textos de la crónica pública, README).
2. **Iconos de app y splash** desde el pack de logos → build nativo + fichas de
   stores (coordina con el brief de Play Store).
3. **PRD y AGENTS.md** a la marca final (entrada ya listada en `pendientes.md`).
4. **Dominio propio** — rompe coste 0 (~10-15 €/año), decisión explícita de Chris;
   al hacerlo: `APP_URL` en `config.ts` + `api/og.ts`, dominio en Vercel y
   autenticación en Brevo (adiós al remitente `brevosend.com`).
5. `api/og.ts` y la página de campaña con la paleta nueva (la tarjeta OG es el
   primer contacto de mucha gente con la marca).

**Problema:** el 2 y el 4 tienen coste/burocracia (build, stores, dominio).
**Opción recomendada:** cerrar 1, 3 y 5 por OTA en cuanto acaben las fases 1-2, y
agrupar 2+4 con el build nativo de la fase 4-P1.

---

## Orden, dependencias y coordinación

```
F0 (decisiones) → F1 (color) → F2 (tipo) → F3 (iconos, por capas)
                                  ↘ F4 (componentes/motion, por focos) → F5 (copy)
F6.1/3/5 tras F1-F2 · F6.2/4 con el build nativo de F4
```

- **Color antes que tipografía, y ambas antes que iconos**: máximo impacto de
  identidad con mínimo riesgo, y cada fase hace de QA de la anterior.
- **Somos dos en el repo**: las fases 1-2 tocan transversalmente — avisar antes de
  arrancarlas para no cruzar PRs de features en medio del barrido.
- **Un solo build nativo** al final de la fase 4 recoge todo lo nativo (blur,
  iconos de app); el resto del plan entero viaja por OTA.
- Cada PR de fase pasa `typecheck · lint · test` + `qa-visual` de sus pantallas,
  como siempre.
