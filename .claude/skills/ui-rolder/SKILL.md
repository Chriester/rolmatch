---
name: ui-rolder
description: Inventario del design system rolder — tokens, primitivas y componentes existentes y dónde viven. Usar antes de construir UI para reutilizar en vez de reinventar (y no re-leer media base de código).
---

# Design system rolder — inventario

Spec completa en docs/design-rolder/README.md. Dark-only; UI en español.

## Tokens — `src/constants/theme.ts`
`Rolder.{page #0B0B12, surface, surfaceBorder, input, violet #8B6CFF,
violetSoft/Softer, coral/pass #FF5A5F, like #3BD16F, gold, textSecondary/
Tertiary, brandGradient coral→violeta, likeGradient, goldGradient}` ·
`RolderFonts` Sora 400/600/700/800 + Nunito_900Black (sellos) · `Spacing` ·
`MaxContentWidth`.

## Primitivas — `src/components/ui.tsx`
ScreenTitle · ScreenBlurb · SectionLabel (11/700 uppercase violeta) ·
PrimaryButton (gradiente verde) · OutlineButton (tone violet/white/red/gold) ·
DiscordButton · ListRow (+dashed para «+ crear») · StyleBar · StatusPill ·
XpBar (nivel + progreso).

## Componentes clave
- Marca: `brand.tsx` (SVG nativo) / `brand.web.tsx` (CSS) — ¡mantener exports
  paralelos! Los gradientes SVG NO renderizan en web.
- Swipe: `swipe/card-shell.tsx` (CardShell, CardChip/Row, **CardBlurb** caja
  translúcida, **CardHint** chevron pulsante, cardText.{title,blurb,compat,soft}),
  `card-cycle.tsx` (caras + barras stories full-width, onFaceChange),
  `deck.tsx` (física — parámetros arriba del archivo), `action-bar.tsx`
  (botonera que monta sobre el borde de la tarjeta), `details-face.tsx`.
- `character-sheet-view.tsx` (hoja temada) + `lib/sheet-schema.ts` (campos por
  sistema + temas con unlock free/premium/nivel).
- `calendar-picker.tsx` (calendario de mes sin dependencias, multiselección).
- `app-header.tsx` (marca + avatar→/profile + punto de no-leídos).
- Tabs: `(tabs)/_layout.tsx` — iconos sin fondo, halo solo al presionar,
  Feed central con gradiente, badge de chats.
- `chip.tsx` (Chip seleccionable de formularios) · `photo-picker.tsx` ·
  `style-axis.tsx` · `availability-grid.tsx` · `update-overlay.tsx`.

## Patrones obligados
- `showAlert`/`confirmAction` de `lib/alert.ts` (Alert.alert es no-op en web).
- Háptica: `lib/haptics.ts` (Vibration en Android, expo-haptics iOS, siempre
  con guard) — hapticTap/Arm/Swipe/Match.
- Asistentes por pasos: patrón de onboarding.tsx / character-form.tsx
  (stepHeader + progressRow + secciones).
- React Compiler activo: nada de setState síncrono en efectos (lint
  set-state-in-effect); mover a callbacks/timeouts.
- Módulos con supabase se importan perezosos desde libs puras testeables
  (patrón lib/xp.ts) para que Jest no cargue AsyncStorage.
