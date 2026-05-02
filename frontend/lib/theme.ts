// Design tokens — mirrors the prototype HTML's CSS custom properties.
// Aesthetic: editorial-brutalist. Cream paper, hard black borders, 3px
// offset hard shadows, Fraunces serif for big headings, Geist for body.

import { Platform, ViewStyle, TextStyle } from 'react-native';

export const colors = {
  bg:     '#f5f1e8', // cream page background
  paper:  '#fefcf7', // slightly warmer card background
  ink:    '#1a1a1a', // near-black text + borders
  accent: '#ff5722', // vivid orange-red — primary action, expiring highlight
  green:  '#2d6a4f',
  amber:  '#e67e22',
  red:    '#c0392b',
  muted:  '#7a7468', // warm gray for secondary text
  border: '#1a1a1a',

  // Pastel category backgrounds (stat cards, item icons)
  urgentBg: '#ffe5dc', // peach (eat_now / compost)
  soonBg:   '#fff4d6', // light yellow (eat_soon / freeze_now / use_in_recipe)
  freshBg:  '#d8ebd9', // light green (safe)
  blueBg:   '#e3edf7', // light blue (monitor)
} as const;

// Action → category bucket
export function bucketForAction(action: string | null): 'urgent' | 'soon' | 'fresh' | 'monitor' {
  if (!action) return 'fresh';
  if (action === 'eat_now' || action === 'compost') return 'urgent';
  if (action === 'eat_soon' || action === 'freeze_now' || action === 'use_in_recipe') return 'soon';
  if (action === 'monitor') return 'monitor';
  return 'fresh';
}

export function bucketBg(bucket: ReturnType<typeof bucketForAction>): string {
  return bucket === 'urgent' ? colors.urgentBg
       : bucket === 'soon'   ? colors.soonBg
       : bucket === 'monitor'? colors.blueBg
       :                       colors.freshBg;
}

export function bucketBadgeBg(bucket: ReturnType<typeof bucketForAction>): string {
  return bucket === 'urgent' ? colors.red
       : bucket === 'soon'   ? colors.amber
       : bucket === 'monitor'? '#3b82f6'
       :                       colors.green;
}

// Typography. Fraunces (serif) for headings; Geist (sans) for body.
// Loaded by _layout.tsx via @expo-google-fonts. Fall back to platform
// serif/sans-serif until fonts load so first paint isn't a blank screen.
export const fonts = {
  serif:        Platform.select({ default: 'Fraunces_800ExtraBold', web: '"Fraunces", serif' }) as string,
  serifSemi:    Platform.select({ default: 'Fraunces_600SemiBold',  web: '"Fraunces", serif' }) as string,
  body:         Platform.select({ default: 'Geist_400Regular',      web: '"Geist", sans-serif' }) as string,
  bodyMedium:   Platform.select({ default: 'Geist_500Medium',       web: '"Geist", sans-serif' }) as string,
  bodySemi:     Platform.select({ default: 'Geist_600SemiBold',     web: '"Geist", sans-serif' }) as string,
};

// "Hard offset" shadow — the prototype's signature look. iOS uses the
// real shadow props; Android elevation can't do zero-blur so it gets
// a small elevation as a softer approximation.
export function hardShadow(offset: number = 3): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.border,
      shadowOffset: { width: offset, height: offset },
      shadowOpacity: 1,
      shadowRadius: 0,
    },
    android: {
      elevation: Math.min(offset, 4),
    },
    web: {
      // RN-Web maps boxShadow style — exact prototype look on the browser.
      boxShadow: `${offset}px ${offset}px 0 ${colors.border}`,
    } as any,
    default: {},
  })!;
}

export const radii = { sm: 10, md: 14, lg: 16, xl: 18, pill: 100 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 32 };

// Common card style: paper bg, 1.5px black border, rounded.
export const cardBase: ViewStyle = {
  backgroundColor: colors.paper,
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: radii.lg,
  padding: space.md,
};

// Hero text style for large screen titles.
export const screenTitle: TextStyle = {
  fontFamily: fonts.serif,
  fontSize: 32,
  fontWeight: '800',
  letterSpacing: -1,
  color: colors.ink,
};

export const screenSubtitle: TextStyle = {
  fontFamily: fonts.body,
  fontSize: 13,
  color: colors.muted,
  marginBottom: space.xl,
};

export const sectionLabel: TextStyle = {
  fontFamily: fonts.bodyMedium,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 1.2,
  color: colors.muted,
  marginTop: 18,
  marginBottom: space.sm + 2,
};
