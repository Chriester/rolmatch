// Design tokens de rolder (handoff design_handoff_rolder/README.md).
// La app es dark-only: use-theme fuerza siempre la paleta oscura.

import '@/global.css';

import { Platform } from 'react-native';

/** Paleta rolder — fuente de verdad de color en toda la app */
export const Rolder = {
  // Fondos y superficies
  page: '#0B0B12',
  app: '#101018',
  surface: '#16161F',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  input: '#1B1B26',
  sheet: '#14141E',

  // Marca
  coral: '#FF5A5F',
  violet: '#8B6CFF',
  violetSoft: '#B9A6FF',
  violetSofter: '#CBBAFF',
  discord: '#5865F2',

  // Semánticos
  like: '#3BD16F',
  likeDark: '#22A855',
  onLike: '#0B2416',
  likeChipText: '#7FF2AC',
  likeChipBg: 'rgba(59,209,111,0.22)',
  likeChipBorder: 'rgba(59,209,111,0.6)',
  pass: '#FF5A5F',
  onPass: '#3D0A0C',
  gold: '#F5A623',
  goldLight: '#F5C34D',
  goldDark: '#D9902A',
  onGold: '#3A2503',

  // Texto (sobre fondo oscuro)
  text: 'rgba(255,255,255,0.85)',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.45)',

  // Gradientes (para expo-linear-gradient / svg)
  brandGradient: ['#FF5A5F', '#8B6CFF'] as const,
  likeGradient: ['#3BD16F', '#22A855'] as const,
  goldGradient: ['#F5C34D', '#D9902A'] as const,
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
