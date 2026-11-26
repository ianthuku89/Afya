// Afya Yako theme: "Ivory & Ink"
// Single source of truth for colours, type, radii and shadows.
// Place at src/theme.ts (or src/theme/index.ts) so '../../theme' resolves from screens.

import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  // Surfaces
  ground: '#F7F5F0', // screen background (ivory)
  surface: '#FFFFFF', // cards
  line: '#E2DED4', // borders and dividers

  // Text
  text: '#14181F', // ink
  muted: '#5F6670', // secondary text (passes 4.5:1 on ground and surface)

  // Brand accent (the only brand colour)
  accent: '#0F5F57', // deep teal
  accentInk: '#FFFFFF', // text on accent

  // Status
  danger: '#B42318', // coverage lapsed
} as const;

// Tier dots. Same families as before, deepened slightly so they read on white.
export const tierColors: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#9AA0A6',
  GOLD: '#D4A017',
  PLATINUM: '#00A555',
};

export const tierFacilities: Record<string, string> = {
  BRONZE: 'Level 1 & 2 facilities',
  SILVER: 'Level 2 & 3 facilities',
  GOLD: 'Level 2 & 3 facilities',
  PLATINUM: 'Level 4 & 5 hospitals',
};

// Plus Jakarta Sans. Load these in App.tsx (see the setup note).
// With custom fonts, pick the weight through fontFamily, not fontWeight.
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const radii = {
  card: 20,
  button: 14,
  icon: 12,
  pill: 999,
} as const;

export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };

export const shadows: { card: ViewStyle } = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#14181F',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle,
};