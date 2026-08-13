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
} as const;

/** Familias tipográficas cargadas en _layout (Sora para todo; Nunito en sellos) */
export const RolderFonts = {
  regular: 'Sora_400Regular',
  semibold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
  extrabold: 'Sora_800ExtraBold',
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
    sans: 'Sora_400Regular',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Sora_400Regular',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Sora_400Regular, var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
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
