export const tokens = {
  color: {
    violet: '#7C3AED',
    violetLight: '#A78BFA',
    coral: '#FF5A6F',
    cyan: '#22D3EE',
    amber: '#FBBF24',
    green: '#22C55E',
    ink: '#111827',
    paper: '#FFFFFF',
    night: '#090E1A',
    slate: '#64748B',
    danger: '#DC2626'
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    pill: 999
  },
  type: {
    display: 40,
    title: 28,
    heading: 22,
    body: 16,
    caption: 13
  },
  motion: {
    quick: 160,
    standard: 260,
    celebration: 650
  },
  touchTarget: 48
} as const;

export const lightTheme = {
  background: '#F7F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F6',
  text: '#111827',
  textMuted: '#5D6473',
  border: '#DDE1EA',
  primary: tokens.color.violet,
  onPrimary: '#FFFFFF',
  danger: tokens.color.danger,
  success: '#15803D'
} as const;

export const darkTheme = {
  background: '#090E1A',
  surface: '#151B2A',
  surfaceMuted: '#20283A',
  text: '#F8FAFC',
  textMuted: '#ABB4C4',
  border: '#344058',
  primary: tokens.color.violetLight,
  onPrimary: '#111827',
  danger: '#F87171',
  success: '#4ADE80'
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
