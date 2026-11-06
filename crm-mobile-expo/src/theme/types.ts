/* ============================================================
   THEME TYPES
   ------------------------------------------------------------
   Option ids must match crm-backend-mongo/src/models/
   Company.model.ts (THEME_PRESETS, COLOR_MODES, ...).
============================================================ */

export const THEME_PRESET_IDS = [
  'classic',
  'emerald',
  'sunset',
  'royal',
  'graphite',
] as const;

export type ThemePresetId = (typeof THEME_PRESET_IDS)[number];

export type ColorMode = 'light' | 'dark' | 'system';
export type CornerStyle = 'sharp' | 'rounded' | 'pill';
export type Density = 'compact' | 'comfortable';

/**
 * Everything needed to build a theme. Comes from the server
 * (company branding resolved for the signed-in user), from the
 * pre-login company lookup, or from DEFAULT_THEME_CONFIG.
 */
export interface ThemeConfig {
  preset: ThemePresetId;
  colorMode: ColorMode;
  primaryColor: string | null;
  accentColor: string | null;
  cornerStyle: CornerStyle;
  density: Density;
  displayName: string;
  logoUrl: string | null;
}

export interface ThemeColors {
  /* Brand */
  primary: string;
  primaryDark: string;
  primaryLight: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;

  /* Surfaces */
  background: string;
  surface: string;
  surfaceAlt: string;
  overlay: string;
  shadow: string;

  /* Text */
  text: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  /** Text on top of primary/coloured surfaces. */
  textInverse: string;

  /* Lines */
  border: string;
  borderStrong: string;

  /* Feedback */
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  /* Lead/Opportunity status colors — reused across badges */
  status: {
    new: string;
    contacted: string;
    qualified: string;
    won: string;
    lost: string;
  };
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ThemeRadius {
  sm: number;
  md: number;
  lg: number;
  full: number;
}

export interface Theme {
  /** Changes whenever any visible token changes. */
  key: string;
  preset: ThemePresetId;
  presetName: string;
  isDark: boolean;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  config: ThemeConfig;
  brand: {
    displayName: string;
    logoUrl: string | null;
  };
}
