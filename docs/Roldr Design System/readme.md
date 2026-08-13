# Roldr Design System

**Roldr** is a matchmaking app for tabletop RPGs: a Tinder-style swipe deck where players find
open tables ("mesas") and game masters find players. One card = one table. Swipe right (the d20
button) asks the GM for a seat; a match means the GM saved you one.

The product is **Spanish-language and dark-first**, mobile (390×844) native-feeling. Mood: a
lamplit table at night — deep violet-black room, one warm carmine light source. Not neon
cyber, not parchment fantasy.

## Sources given

| Source | What it gave |
|---|---|
| `guidelines/source-Roldr-app-aesthetic-exploration.pdf` | **The ground truth.** "Handoff a desarrollo · Roldr · Sistema de color": base scales, semantic roles, gradient rules, WCAG table, reference components (buttons + chips), list of intended export files |
| `uploads/roldr-logo-full.PNG` | Full lockup: d20 with **R**, orbit ring, stars |
| `uploads/roldr-logo-minimal.PNG` | d20 with **R**, no orbit → `assets/logo-mark.png` |
| `uploads/roldr-logo-dice.PNG` | Plain d20 → `assets/logo-d20.png` |
| `uploads/roldr-logo-noR.PNG` | d20 + orbit + stars, no R → `assets/logo-d20-orbit.png` |
| `uploads/roldr-logo-text.PNG` | Wordmark "R◇ldr" (d20 replaces the *o*) → `assets/logo-wordmark.png` |
| `uploads/background.PNG` | 4000×3500 gradient wash → `assets/background-gradient.png` |

No codebase, no Figma file, no font binaries, and **no product screenshots or photography**
were supplied. Everything below either comes from the PDF handoff or is an explicit, flagged
extrapolation from it.

The PDF names five export files (`export/roldr-colors.css`, `.tokens.json`,
`tailwind.roldr.js`, `Roldr.swift`, `colors.xml`) that were **not** attached. If they exist,
they are the authority over `tokens/colors.css`.

---

## CONTENT FUNDAMENTALS

**Language is Spanish (Spain), and that is not incidental** — it's the register of a group of
friends organising a game, not an app talking to a user.

- **Person:** second person singular, informal *tú* ("Desliza hasta tu próxima mesa", "Te he
  guardado la última plaza"). The app says *nosotros* only when it does something on your
  behalf ("Buscamos mesas en un radio de 15 km"). Never *usted*, never corporate *nosotros los
  de Roldr*.
- **Casing:** sentence case everywhere. `UPPERCASE` is reserved for badges and overlines
  (11px, 8% tracking): `EN DIRECTO`, `2 PLAZAS`. No Title Case On Buttons.
- **Buttons are verbs in the infinitive or first person:** "Unirme", "Pedir plaza", "Empezar a
  buscar", "Seguir buscando", "Ahora no". Never "Enviar" / "Aceptar" / "OK".
- **Domain vocabulary is used straight, never explained down:** *mesa* (table/session),
  *máster* (GM), *plaza* (seat), *one-shot*, *campaña*, *ficha* (character sheet), *tirada*,
  *CD 15*. A player who doesn't know "one-shot" is not the audience; a chip labelled
  `Principiantes` is how the app welcomes them instead.
- **Length:** headings 2–5 words, one line at 390px. Body copy 1–2 sentences. Table pitches
  written by GMs run 2 sentences with a concrete promise and a concrete risk: *"Bajamos a la
  tumba con seis personajes y salimos con dos."*
- **Numbers:** Spanish decimal comma and units with a space — `a 3,2 km`, `20:30`, `18,4:1`.
  Dice and difficulty always in mono: `2d6+3`, `d20`, `CD 15`.
- **Emoji:** essentially no. The UI never ships emoji — icons do that job. They may appear
  inside *user-written* chat strings only (a GM typing "todo correcto 👌"), and never in
  labels, headings, buttons or badges.
- **Tone:** dry, warm, slightly conspiratorial. It assumes you want to play tonight. Avoid
  hype adjectives ("¡increíble!", "épico"), avoid apology padding ("Lo sentimos, parece
  que…"). Empty states state the fact and offer the next move: *"No hay mesas presenciales
  hoy. Prueba en línea o amplía el radio."*
- **Celebration copy is short and one-shot:** `¡Mesa encontrada!` — the only exclamation mark
  in the product.

---

## VISUAL FOUNDATIONS

### Colour
Everything derives from the logo gradient: **carmine `#B01B5E` → plum `#8A2B76` → violet
`#5D4A93`**, with **lilac `#C77DFF`** as the on-dark accent/link. Neutrals are **tinted, never
pure grey** — a desaturated violet base runs from `#0A090C` (bg) to `#F5F2F8` (text), so UI
chrome belongs to the same family as the brand. Functional: `#3FBF8F` success, `#E8A44C`
warning, `#E5484D` danger. Dark-first; **no light theme is defined yet** (don't invent one —
ask).

Consume the **semantic roles** (`--bg`, `--surface`, `--text-muted`, `--link`, `--live`…),
never the raw scales. Violet on the background fails contrast (2.9:1) — use lilac for text.

### Gradient rules (from the handoff, verbatim in intent)
Angle is always **100°**, all three stops, never cropped to one colour.
- **Yes:** the logo; exactly **one primary CTA per screen**; ambient radial light at 12–20%
  behind content.
- **No:** full-screen gradients, gradient behind paragraphs, two gradient CTAs in one view,
  gradient over gradient.
- Text on gradient is always pure `#FFFFFF` at weight 700.

The one full-surface exception is the supplied `background-gradient.png`, used for splash,
onboarding and empty states — always under a bottom-up near-black protection gradient.

### Type
No font files were supplied. Substituted from Google Fonts (see **Caveats**):
- **Display — Outfit** (geometric sans, closest to the wordmark's circular *o/d* and flat-legged
  *R*): 40 / 32 / 24 / 20, weights 600–700, tracking −2% at display sizes.
- **Body/UI — Manrope**: 17 / 15 / 13 / 11, weights 400–600, line-height 1.5.
- **Mono — JetBrains Mono**: dice notation, system codes, ratios — anything a player reads
  aloud at the table.

Eight sizes total. Nothing else gets invented.

### Spacing & layout
4px base step (4·8·12·16·20·24·32·40·48·64). **20px screen gutter, 16px card padding, 12px
stack gap, 24px between sections.** Buttons 12/18. Chips 6/12. Minimum tap target 44px. Frame
width 390px; tab bar 64px, header 56px — both fixed and glass-blurred, content scrolls under.
Exactly one primary action docked at the bottom of a detail screen.

### Backgrounds & imagery
The app is **flat dark surfaces plus one light source**, not textures: no patterns, no grain,
no hand-drawn illustration, no noise overlay. Depth comes from surface value (900 → 800 → 700)
first and shadow second. Ambient radial brand light (12–20%) sits behind hero content only,
once per screen. Table cover art is full-bleed inside the card at radius 24, slightly
desaturated and contrast-lifted (`saturate(.9) contrast(1.05)`) so white text and chips hold —
imagery reads **cool and lamplit, never warm-golden or b&w**. Every image that carries text
gets the bottom protection gradient (`--scrim-bottom`), never a capsule behind the text.

### Corners, borders, cards
4 / 8 / **12 default (buttons, inputs)** / **16 cards** / **24 swipe cards & sheets** / pill
(chips, avatars, badges, action circles). A card is `--surface` fill + **1px `--border`
(`#2E2839`) hairline** + radius 16 + an inset white 6% top hairline; raised variants move to
`--surface-raised` and take `--shadow-card`. Borders are hairlines only — 2px is reserved for
the focus ring and the GM avatar ring.

### Shadows & glow
Shadows are always near-black `#0A090C` at 55–75% (never coloured drop shadows), from
`0 1px 2px` up to `0 18px 48px` under the swipe card; sheets throw upward. The only coloured
light is `--glow-brand` (carmine 35%) under the primary/join button and `--glow-accent` (lilac)
around the save action.

### Transparency & blur
Blur is used in exactly three places: fixed header, tab bar (`rgba(19,17,25,.86)` +
`blur(14px)`), and the sheet scrim (`#0A090C` 72% + slight blur). Chips are **always** alpha
over the surface — fill 12% resting / 28% selected, border 40% → 60% — never solid. No glass
cards, no frosted panels floating over content.

### Motion
90ms press · 140ms hover/chip · 220ms sheets and fades · 320ms match reveal · 420ms swipe
fling and re-stack. Default easing `cubic-bezier(.2,.8,.2,1)`; entrances use
`cubic-bezier(.16,1,.3,1)`. **One overshoot easing exists** —
`--ease-dice cubic-bezier(.34,1.4,.64,1)` — and it is only for the dice/join button press and
the match pop (scale .6 → 1). Everything else is fades and small translates (≤14px). No
bounces, no spinners longer than one card cycle.

### States
- **Hover** (pointer only): `brightness(1.08)` on filled buttons; white 8% wash on ghost;
  chips lift border 40% → 60%. Never a hue change.
- **Press:** `scale(.97)` on buttons, `.92` on the round swipe actions. No colour change.
- **Selected:** chips go to 28% fill; nav goes lilac; `--selected` (violet) fills selected
  rows.
- **Focus:** 2px `rgba(199,125,255,.55)` ring, 2px offset — never replaces the fill.
- **Disabled:** 40% opacity, pointer-events off, no greyscale filter.

---

## ICONOGRAPHY

**No icon set was supplied** — no icon font, no sprite, no SVGs, and the brand has no bespoke
glyph family. Substituted: **Lucide** (`lucide-static@0.428.0`, CDN), chosen for its 24px grid
/ 2px-stroke geometry, which sits closest to the thin white facet lines of the d20 mark.
**Flagged for replacement.**

- Delivered through `components/core/Icon.jsx`: the CDN SVG is applied as a CSS mask and filled
  with `currentColor`, so an icon inherits `--text`, `--text-muted`, `--brand-lilac`, etc.
  Never `<img>` a Lucide SVG directly — it renders black.
- Default size 20px; 13–14px inside chips, 22px in the tab bar, 24–28px in the round swipe
  actions.
- Working set: `dices` (the product's own verb — join, system, deck), `sparkles` (matches),
  `message-circle`, `user`, `users`, `map-pin`, `calendar`, `search`,
  `sliders-horizontal`, `bookmark`, `heart`, `x`, `chevron-left`, `share-2`, `settings`,
  `log-out`, `plus`, `check`, `shield`, `swords`.
- **`dices` is load-bearing:** it marks the join action and every "system" line. Don't swap it
  for a heart — Roldr's yes is "sit at the table", not "like".
- **Emoji are never used as icons.** Neither are unicode glyphs, except the middle dot `·` as
  a metadata separator and `✓ / ✗` inside these guideline cards.
- The d20 mark (`assets/logo-d20.png`) doubles as the app's home/brand glyph in the header at
  28px. It is a logo, not an icon — never recoloured, never used in a row of UI icons.

---

## Intentional additions

The handoff defines only two reference components (**Button** — radius 12, padding 12/18,
primary/secondary/ghost — and **Chip** — alpha fill 12–28%, border 40–60%). Those are copied
exactly. Everything else is an addition needed to assemble a screen at all, and is listed
honestly:

| Added | Why |
|---|---|
| `Icon` | Wrapper for the substituted Lucide set so tinting is consistent |
| `Badge` | The handoff's "avisos de partida en directo" carmine role needs a carrier |
| `Card` | The `surface` + `border` roles describe a card; nothing rendered them |
| `Input` | `surfaceRaised` is specified for inputs; no component existed |
| `Avatar` | Matchmaking needs player/GM identity; gradient-initials fallback avoids fake photos |
| `TopBar`, `BottomNav` | Required to show a screen; built only from documented roles |
| `Sheet` | The handoff mentions "hojas modales" (modal sheets) as a `surface` use |
| `SwipeCard`, `SwipeActions`, `MatchBanner` | The product's core interaction; no source artefact existed, so these are the most extrapolated files in the system — **review first** |

---

## Index

| Path | What |
|---|---|
| `styles.css` | The one file consumers link — `@import` list only |
| `tokens/` | `fonts` · `colors` · `typography` · `spacing` · `radius` · `elevation` · `motion` · `gradients` · `base` |
| `assets/` | `logo-full` · `logo-mark` · `logo-d20` · `logo-d20-orbit` · `logo-wordmark` · `background-gradient` (PNG, transparent except the background) |
| `components/core/` | `Button` · `Chip` · `Badge` · `Card` · `Icon` |
| `components/forms/` | `Input` |
| `components/profile/` | `Avatar` |
| `components/navigation/` | `TopBar` · `BottomNav` |
| `components/overlays/` | `Sheet` |
| `components/matchmaking/` | `SwipeCard` · `SwipeActions` · `MatchBanner` |
| `ui_kits/roldr-app/` | Click-through app recreation — see its own README |
| `guidelines/*.card.html` | Foundation specimen cards (Colors, Type, Spacing, Brand) |
| `guidelines/source-Roldr-app-aesthetic-exploration.pdf` | The original handoff |
| `thumbnail.html` | Homepage tile |
| `SKILL.md` | Agent-Skills entry point |

Each component directory also holds `<Name>.d.ts` (props contract) and `<Name>.prompt.md`
(what & when + usage example).

---

## Caveats

1. **Fonts are substitutions.** Outfit / Manrope / JetBrains Mono are loaded from Google Fonts
   because no binaries came with the handoff. Send the real files and `tokens/fonts.css`
   becomes local `@font-face` rules.
2. **Icons are substitutions.** Lucide via CDN; see ICONOGRAPHY.
3. **No light theme.** The handoff says none is defined. Not invented here.
4. **No typography, spacing, motion or component spec existed** beyond buttons and chips — that
   layer is extrapolated from the colour handoff, the logo geometry and the product's obvious
   platform conventions. It is internally consistent, not authoritative.
5. **No photography.** Swipe cards fall back to the brand gradient at 55%. No image
   placeholders were invented.
6. **No logo was drawn.** All marks are the supplied PNGs. Note that the orbit/star lockups use
   near-black stars, so on dark surfaces use `logo-mark`, `logo-d20` or the wordmark.
