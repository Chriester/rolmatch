// Design tokens Roldr — traducción a RN de docs/Roldr Design System/tokens/
// (fase 1 del plan docs/plan-adopcion-roldr.md; ante conflicto, manda el
// sistema). La app es dark-only: use-theme fuerza siempre la paleta oscura.
// Se conservan los NOMBRES de token históricos (violet, like, coral, gold…)
// para no tocar a cada consumidor: cambia lo que valen, no cómo se llaman.

import '@/global.css';

import { Platform } from 'react-native';

/** Paleta Roldr — fuente de verdad de color en toda la app */
export const Rolder = {
  // Fondos y superficies (neutros teñidos de violeta, nunca gris puro)
  page: '#0A090C', // --bg (neutral-900)
  app: '#0F0D13',
  surface: '#131119', // --surface (neutral-800)
  surfaceBorder: '#2E2839', // --border: hairline sólido, no blanco alfa
  input: '#1D1926', // --surface-raised (neutral-700)
  sheet: '#1D1926', // --surface-overlay

  // Marca (gradiente del logo, 100°: carmesí → ciruela → violeta; lila = acento)
  carmine: '#B01B5E',
  plum: '#8A2B76',
  brandViolet: '#5D4A93',
  coral: '#E5484D', // histórico: hoy es --danger
  violet: '#C77DFF', // acento/link interactivo (--accent, lila)
  violetSoft: '#D8A9FF',
  violetSofter: '#E3C4FF',
  /** --selected: relleno de fila/celda seleccionada (violeta de marca) */
  selected: '#5D4A93',
  discord: '#5865F2', // marca de Discord, no se toca

  // Semánticos (--success / --warning / --danger)
  like: '#3FBF8F',
  likeDark: '#2E9B72',
  onLike: '#0B2416',
  likeChipText: '#8FE9CB',
  likeChipBg: 'rgba(63,191,143,0.22)',
  likeChipBorder: 'rgba(63,191,143,0.6)',
  pass: '#E5484D',
  onPass: '#3D0A0C',
  gold: '#E8A44C',
  goldLight: '#F0BE7A',
  goldDark: '#C98634',
  onGold: '#3A2503',

  // Texto (--text / --text-muted; tertiary interpola hacia --text-disabled)
  text: '#F5F2F8',
  textSecondary: '#A39BB4',
  textTertiary: '#7E7691',

  // Gradientes (para expo-linear-gradient / svg)
  brandGradient: ['#B01B5E', '#8A2B76', '#5D4A93'] as const,
  likeGradient: ['#3FBF8F', '#2E9B72'] as const,
  goldGradient: ['#F0BE7A', '#C98634'] as const,

  // Superficies de sistema (F4): scrim de modales/sheets y el sólido que
  // sustituye al blur de cabeceras/barras hasta que haya build nativo con
  // expo-blur (fallback oficial del propio design system)
  scrim: 'rgba(10,9,12,0.72)',
  chromeSolid: 'rgba(19,17,25,0.86)',
} as const;

/** Escala de radios Roldr (--radius-*): controles md, cards lg, tarjetas de
 *  swipe y sheets xl, chips/pills pill. Nada de valores sueltos nuevos. */
export const RolderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Sombras del sistema: casi-negras siempre; el glow SOLO bajo el CTA de
 *  marca (--glow-brand) — nunca sombras de color en el resto. */
export const RolderShadow = {
  card: '0 4px 14px rgba(0,0,0,0.45)',
  floating: '0 6px 18px rgba(0,0,0,0.45)',
  glowBrand: '0 8px 28px rgba(176,27,94,0.35)',
} as const;

/** Familias tipográficas cargadas en _layout — sistema Roldr: Manrope para
 *  cuerpo/UI, Outfit para display (títulos), JetBrains Mono para notación de
 *  dados (2d6+3, CD 15). Nunito solo en los sellos ¡CRÍTICO!/PIFIA. */
export const RolderFonts = {
  regular: 'Manrope_400Regular',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Outfit_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
  sticker: 'Nunito_900Black',
} as const;

export const Colors = {
  light: {
    text: '#FFFFFF',
    background: Rolder.page,
    backgroundElement: Rolder.surface,
    backgroundSelected: Rolder.input,
    textSecondary: Rolder.textSecondary,
  },
  dark: {
    text: '#FFFFFF',
    background: Rolder.page,
    backgroundElement: Rolder.surface,
    backgroundSelected: Rolder.input,
    textSecondary: Rolder.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Manrope_400Regular',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'JetBrainsMono_400Regular',
  },
  default: {
    sans: 'Manrope_400Regular',
    serif: 'serif',
    rounded: 'normal',
    mono: 'JetBrainsMono_400Regular',
  },
  web: {
    sans: 'Manrope_400Regular, var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'JetBrainsMono_400Regular, var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
