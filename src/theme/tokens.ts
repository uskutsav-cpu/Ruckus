import { Platform } from 'react-native';

export const tokens = {
  color: {
    ruckus: '#BCEB49',
    ruckusPressed: '#A9D53E',
    ruckusSoft: '#EFF8D8',
    violet: '#176B5B',
    violetLight: '#65C9B0',
    violetDeep: '#163D35',
    coral: '#C64B52',
    coralSoft: '#F8E6E7',
    cyan: '#4F8FA3',
    amber: '#B87521',
    green: '#2F7D5C',
    ink: '#171918',
    inkSoft: '#252826',
    paper: '#F8F8F5',
    night: '#0D0F0E',
    slate: '#666C68',
    danger: '#C33E46',
    white: '#FFFFFF'
  },
  space: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    huge: 64
  },
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 999
  },
  type: {
    hero: 44,
    display: 36,
    title: 30,
    heading: 22,
    body: 16,
    label: 15,
    caption: 13,
    micro: 12
  },
  weight: {
    regular: '400',
    medium: '500',
    bold: '600',
    heavy: '700',
    black: '700'
  },
  lineHeight: {
    hero: 48,
    display: 41,
    title: 36,
    heading: 28,
    body: 24,
    caption: 18
  },
  motion: {
    instant: 80,
    quick: 140,
    standard: 220,
    slow: 320,
    celebration: 420
  },
  layout: {
    maxContentWidth: 560,
    screenPadding: 20,
    cardPadding: 16,
    actionHeight: 52,
    compactPhoneHeight: 700
  },
  shadow: {
    card: Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12
      },
      android: { elevation: 3 },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10
      }
    }),
    floating: Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6
      },
      android: { elevation: 2 },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6
      }
    })
  },
  haptics: {
    action: 'light',
    decision: 'medium',
    threshold: 'selection',
    celebration: 'success'
  },
  touchTarget: 48
} as const;

export const lightTheme = {
  background: '#F7F7F4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#EFF1EE',
  surfaceStrong: '#E2E5E1',
  text: '#171918',
  textMuted: '#5C625E',
  textSubtle: '#818782',
  border: '#DEE1DD',
  primary: '#176B5B',
  onPrimary: tokens.color.white,
  accent: tokens.color.violet,
  accentMuted: '#E2F1ED',
  danger: tokens.color.danger,
  success: '#2F7658',
  warning: '#945B16',
  overlay: 'rgba(12,14,13,0.68)',
  skeleton: '#E2E5E1',
  offline: '#342B1C'
} as const;

export const darkTheme = {
  background: '#0D0F0E',
  surface: '#151816',
  surfaceElevated: '#1B1E1C',
  surfaceMuted: '#232724',
  surfaceStrong: '#303531',
  text: '#F5F6F4',
  textMuted: '#B5BAB6',
  textSubtle: '#858B86',
  border: '#303531',
  primary: '#65C9B0',
  onPrimary: '#0B1E19',
  accent: tokens.color.violetLight,
  accentMuted: tokens.color.violetDeep,
  danger: '#F07B80',
  success: '#6BC79C',
  warning: '#D6A15B',
  overlay: 'rgba(3,5,4,0.82)',
  skeleton: '#292E2A',
  offline: '#332A1C'
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
