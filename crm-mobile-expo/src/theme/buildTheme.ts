import { THEME_PRESETS } from '@/theme/presets';
import {
  ensureContrast,
  isHexColor,
  mix,
  readableOn,
} from '@/theme/colorUtils';
import type {
  CornerStyle,
  Density,
  Theme,
  ThemeColors,
  ThemeConfig,
  ThemePresetId,
  ThemeRadius,
  ThemeSpacing,
} from '@/theme/types';
import { THEME_PRESET_IDS } from '@/theme/types';

/* ============================================================
   DEFAULTS
============================================================ */

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  preset: 'classic',
  colorMode: 'system',
  primaryColor: null,
  accentColor: null,
  cornerStyle: 'rounded',
  density: 'comfortable',
  displayName: 'EnterpriseCRM',
  logoUrl: null,
};

const BASE_SPACING: ThemeSpacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

const RADIUS: Record<CornerStyle, ThemeRadius> = {
  sharp: { sm: 2, md: 4, lg: 6, full: 999 },
  rounded: { sm: 6, md: 10, lg: 16, full: 999 },
  pill: { sm: 10, md: 16, lg: 24, full: 999 },
};

function spacingFor(density: Density): ThemeSpacing {
  if (density === 'comfortable') return BASE_SPACING;
  return { xs: 3, sm: 6, md: 12, lg: 18, xl: 26 };
}

/* ============================================================
   VALIDATION
   Anything coming from the network is checked here so a bad
   or partial config can never crash rendering — invalid
   values fall back to the defaults.
============================================================ */

function isPreset(value: unknown): value is ThemePresetId {
  return typeof value === 'string' && (THEME_PRESET_IDS as readonly string[]).includes(value);
}

export function sanitizeThemeConfig(input: Partial<Record<keyof ThemeConfig, unknown>> | null | undefined): ThemeConfig {
  const value = input ?? {};
  const pick = <T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T =>
    typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;

  return {
    preset: isPreset(value.preset) ? value.preset : DEFAULT_THEME_CONFIG.preset,
    colorMode: pick(value.colorMode, ['light', 'dark', 'system'] as const, DEFAULT_THEME_CONFIG.colorMode),
    primaryColor: isHexColor(value.primaryColor) ? value.primaryColor.toUpperCase() : null,
    accentColor: isHexColor(value.accentColor) ? value.accentColor.toUpperCase() : null,
    cornerStyle: pick(value.cornerStyle, ['sharp', 'rounded', 'pill'] as const, DEFAULT_THEME_CONFIG.cornerStyle),
    density: pick(value.density, ['compact', 'comfortable'] as const, DEFAULT_THEME_CONFIG.density),
    displayName:
      typeof value.displayName === 'string' && value.displayName.trim().length > 0
        ? value.displayName.trim().slice(0, 60)
        : DEFAULT_THEME_CONFIG.displayName,
    logoUrl:
      typeof value.logoUrl === 'string' && /^https:\/\//.test(value.logoUrl) ? value.logoUrl : null,
  };
}

/* ============================================================
   BUILD
============================================================ */

function applyBrandOverrides(
  base: ThemeColors,
  isDark: boolean,
  primary: string | null,
  accent: string | null,
): ThemeColors {
  const colors: ThemeColors = { ...base, status: { ...base.status } };

  if (primary) {
    const readable = ensureContrast(primary, colors.surface, 3);
    colors.primary = readable;
    colors.primaryDark = mix(readable, '#000000', isDark ? 0.15 : 0.18);
    colors.primaryLight = isDark ? mix(readable, colors.background, 0.78) : mix(readable, '#FFFFFF', 0.85);
    colors.onPrimary = readableOn(readable);
    colors.status.contacted = readable;
  }

  if (accent) {
    const readable = ensureContrast(accent, colors.surface, 3);
    colors.accent = readable;
    colors.accentSoft = isDark ? mix(readable, colors.background, 0.8) : mix(readable, '#FFFFFF', 0.88);
    colors.status.qualified = readable;
  }

  return colors;
}

export function buildTheme(
  rawConfig: Partial<Record<keyof ThemeConfig, unknown>> | null | undefined,
  systemScheme: 'light' | 'dark' | null | undefined,
): Theme {
  const config = sanitizeThemeConfig(rawConfig);
  const preset = THEME_PRESETS[config.preset];

  const isDark =
    config.colorMode === 'dark' ||
    (config.colorMode === 'system' && systemScheme === 'dark');

  const colors = applyBrandOverrides(
    isDark ? preset.dark : preset.light,
    isDark,
    config.primaryColor,
    config.accentColor,
  );

  return {
    key: [
      config.preset,
      isDark ? 'dark' : 'light',
      config.primaryColor ?? '-',
      config.accentColor ?? '-',
      config.cornerStyle,
      config.density,
    ].join('|'),
    preset: config.preset,
    presetName: preset.name,
    isDark,
    colors,
    spacing: spacingFor(config.density),
    radius: RADIUS[config.cornerStyle],
    config,
    brand: {
      displayName: config.displayName,
      logoUrl: config.logoUrl,
    },
  };
}
