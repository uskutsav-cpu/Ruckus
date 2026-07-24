import { Platform } from 'react-native';

export const tokens = {
  color: {
    ruckus: '#C8F53D',
    ruckusPressed: '#B2DC32',
    ruckusSoft: '#EDFFC1',
    violet: '#6C4BFF',
    violetLight: '#A99AFF',
    violetDeep: '#33266B',
    coral: '#FF625F',
    coralSoft: '#FFE1DF',
    cyan: '#5DDBF2',
    amber: '#FFBC42',
    green: '#30C77B',
    ink: '#101114',
    inkSoft: '#24262D',
    paper: '#FFFDF7',
    night: '#090A0D',
    slate: '#68707D',
    danger: '#D93442',
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
    xs: 8,
    sm: 12,
    md: 18,
    lg: 26,
    xl: 34,
    pill: 999
  },
  type: {
    hero: 48,
    display: 40,
    title: 32,
    heading: 24,
    body: 16,
    label: 14,
    caption: 12,
    micro: 11
  },
  weight: {
    regular: '400',
    medium: '600',
    bold: '700',
    heavy: '800',
    black: '900'
  },
  lineHeight: {
    hero: 49,
    display: 43,
    title: 36,
    heading: 29,
    body: 24,
    caption: 18
  },
  motion: {
    instant: 90,
    quick: 160,
    standard: 260,
    slow: 420,
    celebration: 650
  },
  layout: {
    maxContentWidth: 560,
    screenPadding: 20,
    cardPadding: 18,
    actionHeight: 58,
    compactPhoneHeight: 700
  },
  shadow: {
    card: Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.2,
        shadowRadius: 24
      },
      android: { elevation: 10 },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 22
      }
    }),
    floating: Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 16
      },
      android: { elevation: 7 },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.12,
        shadowRadius: 14
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
  background: '#F4F2EA',
  surface: '#FFFDF7',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#EAE7DE',
  surfaceStrong: '#DDD9CF',
  text: '#101114',
  textMuted: '#565D68',
  textSubtle: '#7B818B',
  border: '#D8D4CA',
  primary: tokens.color.ruckus,
  onPrimary: tokens.color.ink,
  accent: tokens.color.violet,
  accentMuted: '#E7E2FF',
  danger: tokens.color.danger,
  success: '#16794A',
  warning: '#8D5600',
  overlay: 'rgba(9,10,13,0.78)',
  skeleton: '#DDD9CF',
  offline: '#2B2311'
} as const;

export const darkTheme = {
  background: '#090A0D',
  surface: '#15161B',
  surfaceElevated: '#1C1E24',
  surfaceMuted: '#24262D',
  surfaceStrong: '#30333C',
  text: '#FAFAF7',
  textMuted: '#B6BBC4',
  textSubtle: '#858B96',
  border: '#353841',
  primary: tokens.color.ruckus,
  onPrimary: tokens.color.ink,
  accent: tokens.color.violetLight,
  accentMuted: tokens.color.violetDeep,
  danger: '#FF7A84',
  success: '#61E6A5',
  warning: '#FFD17A',
  overlay: 'rgba(3,4,6,0.86)',
  skeleton: '#292C33',
  offline: '#332A13'
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
