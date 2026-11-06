import { readableOn } from '@/theme/colorUtils';
import type { ThemeColors, ThemePresetId } from '@/theme/types';

/* ============================================================
   THEME PRESETS
   ------------------------------------------------------------
   Each preset defines a complete light and dark palette.
   "classic" light is byte-for-byte the palette the app used
   before theming existed, so existing screens look unchanged
   until a company picks something else.
============================================================ */

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  light: ThemeColors;
  dark: ThemeColors;
}

const LIGHT_NEUTRALS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '#000000',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  textInverse: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
};

const DARK_NEUTRALS = {
  background: '#0B1120',
  surface: '#131C2E',
  surfaceAlt: '#1B2539',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textFaint: '#64748B',
  textInverse: '#FFFFFF',
  border: '#26324A',
  borderStrong: '#3A4863',
};

const LIGHT_FEEDBACK = {
  success: '#16A34A',
  successSoft: '#ECFDF3',
  warning: '#D97706',
  warningSoft: '#FFF7E6',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#0891B2',
  infoSoft: '#ECFEFF',
};

const DARK_FEEDBACK = {
  success: '#22C55E',
  successSoft: '#0F2A1C',
  warning: '#F59E0B',
  warningSoft: '#2D2110',
  danger: '#F87171',
  dangerSoft: '#2E1416',
  info: '#22D3EE',
  infoSoft: '#0B2A33',
};

function status(primary: string, accent: string, muted: string, success: string, danger: string) {
  return { new: muted, contacted: primary, qualified: accent, won: success, lost: danger };
}

function palette(
  mode: 'light' | 'dark',
  brand: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    accentSoft: string;
  },
  neutrals: Partial<typeof LIGHT_NEUTRALS> = {},
): ThemeColors {
  const base = mode === 'light' ? LIGHT_NEUTRALS : DARK_NEUTRALS;
  const feedback = mode === 'light' ? LIGHT_FEEDBACK : DARK_FEEDBACK;
  const merged = { ...base, ...neutrals };
  return {
    ...merged,
    ...feedback,
    ...brand,
    onPrimary: readableOn(brand.primary),
    status: status(brand.primary, brand.accent, merged.textMuted, feedback.success, feedback.danger),
  };
}

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  classic: {
    id: 'classic',
    name: 'Classic Blue',
    description: 'Trustworthy corporate blue — the original look.',
    light: palette('light', {
      primary: '#2563EB',
      primaryDark: '#1D4ED8',
      primaryLight: '#DBEAFE',
      accent: '#7C3AED',
      accentSoft: '#F5F3FF',
    }),
    dark: palette('dark', {
      primary: '#3B82F6',
      primaryDark: '#2563EB',
      primaryLight: '#172554',
      accent: '#A78BFA',
      accentSoft: '#241A3D',
    }),
  },

  emerald: {
    id: 'emerald',
    name: 'Emerald',
    description: 'Fresh green for growth-focused sales teams.',
    light: palette(
      'light',
      {
        primary: '#059669',
        primaryDark: '#047857',
        primaryLight: '#D1FAE5',
        accent: '#0EA5E9',
        accentSoft: '#E0F2FE',
      },
      { background: '#F6FBF9', border: '#DDE9E4' },
    ),
    dark: palette('dark', {
      primary: '#059669',
      primaryDark: '#047857',
      primaryLight: '#052E24',
      accent: '#38BDF8',
      accentSoft: '#0C2A3A',
    }, { background: '#07130F', surface: '#0E1D18', surfaceAlt: '#15281F', border: '#1F3A2F' }),
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and rose for energetic brands.',
    light: palette(
      'light',
      {
        primary: '#EA580C',
        primaryDark: '#C2410C',
        primaryLight: '#FFEDD5',
        accent: '#DB2777',
        accentSoft: '#FCE7F3',
      },
      { background: '#FFFAF5', border: '#F1E4D8' },
    ),
    dark: palette('dark', {
      primary: '#EA580C',
      primaryDark: '#C2410C',
      primaryLight: '#3A1A08',
      accent: '#F472B6',
      accentSoft: '#3A1028',
    }, { background: '#140D08', surface: '#1F150E', surfaceAlt: '#2A1D14', border: '#3D2B1E' }),
  },

  royal: {
    id: 'royal',
    name: 'Royal',
    description: 'Premium indigo and gold for luxury and services.',
    light: palette(
      'light',
      {
        primary: '#4F46E5',
        primaryDark: '#4338CA',
        primaryLight: '#E0E7FF',
        accent: '#CA8A04',
        accentSoft: '#FEF9C3',
      },
      { background: '#F8F8FD', border: '#E4E4F2' },
    ),
    dark: palette('dark', {
      primary: '#6366F1',
      primaryDark: '#4F46E5',
      primaryLight: '#1E1B4B',
      accent: '#FACC15',
      accentSoft: '#2E2608',
    }, { background: '#0C0B1D', surface: '#15142B', surfaceAlt: '#1E1D3A', border: '#2C2B4D' }),
  },

  graphite: {
    id: 'graphite',
    name: 'Graphite',
    description: 'Minimal monochrome with a teal accent.',
    light: palette(
      'light',
      {
        primary: '#334155',
        primaryDark: '#1E293B',
        primaryLight: '#E2E8F0',
        accent: '#0D9488',
        accentSoft: '#CCFBF1',
      },
      { background: '#F5F5F5', surfaceAlt: '#EDEDED', border: '#E0E0E0' },
    ),
    dark: palette('dark', {
      primary: '#64748B',
      primaryDark: '#475569',
      primaryLight: '#1E293B',
      accent: '#2DD4BF',
      accentSoft: '#0B2B28',
    }, { background: '#0A0A0A', surface: '#151515', surfaceAlt: '#1F1F1F', border: '#2E2E2E' }),
  },
};

export const PRESET_LIST: ThemePreset[] = Object.values(THEME_PRESETS);
