import { describe, expect, it } from '@jest/globals';

import { buildTheme, DEFAULT_THEME_CONFIG, sanitizeThemeConfig } from '@/theme/buildTheme';
import { contrastRatio } from '@/theme/colorUtils';
import { PRESET_LIST } from '@/theme/presets';

describe('buildTheme', () => {
  it('classic light reproduces the original app palette exactly', () => {
    const theme = buildTheme(DEFAULT_THEME_CONFIG, 'light');
    expect(theme.isDark).toBe(false);
    expect(theme.colors).toMatchObject({
      primary: '#2563EB',
      primaryDark: '#1D4ED8',
      primaryLight: '#DBEAFE',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#E2E8F0',
      success: '#16A34A',
      danger: '#DC2626',
    });
    expect(theme.radius).toEqual({ sm: 6, md: 10, lg: 16, full: 999 });
    expect(theme.spacing).toEqual({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32 });
  });

  it('follows the system scheme only when colour mode is "system"', () => {
    expect(buildTheme({ ...DEFAULT_THEME_CONFIG, colorMode: 'system' }, 'dark').isDark).toBe(true);
    expect(buildTheme({ ...DEFAULT_THEME_CONFIG, colorMode: 'light' }, 'dark').isDark).toBe(false);
    expect(buildTheme({ ...DEFAULT_THEME_CONFIG, colorMode: 'dark' }, 'light').isDark).toBe(true);
  });

  it('every preset keeps text and buttons readable in light and dark mode', () => {
    for (const preset of PRESET_LIST) {
      for (const palette of [preset.light, preset.dark]) {
        expect(contrastRatio(palette.text, palette.background)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(palette.text, palette.surface)).toBeGreaterThanOrEqual(7);
        // WCAG AA for UI components / large text.
        expect(contrastRatio(palette.onPrimary, palette.primary)).toBeGreaterThanOrEqual(3);
        // Legacy screens put white text on primary.
        expect(contrastRatio(palette.textInverse, palette.primary)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('applies company colour overrides and keeps them readable', () => {
    const pale = buildTheme({ ...DEFAULT_THEME_CONFIG, colorMode: 'light', primaryColor: '#FFF59D' }, 'light');
    expect(pale.colors.primary).not.toBe('#FFF59D');
    expect(contrastRatio(pale.colors.primary, pale.colors.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(pale.colors.onPrimary, pale.colors.primary)).toBeGreaterThanOrEqual(3);
  });

  it('changes the key whenever a visible token changes', () => {
    const a = buildTheme(DEFAULT_THEME_CONFIG, 'light');
    const b = buildTheme({ ...DEFAULT_THEME_CONFIG, preset: 'emerald' }, 'light');
    const c = buildTheme({ ...DEFAULT_THEME_CONFIG, cornerStyle: 'pill' }, 'light');
    expect(new Set([a.key, b.key, c.key]).size).toBe(3);
    expect(buildTheme(DEFAULT_THEME_CONFIG, 'light').key).toBe(a.key);
  });
});

describe('sanitizeThemeConfig', () => {
  it('falls back to safe defaults for invalid input from the network', () => {
    const config = sanitizeThemeConfig({
      preset: 'neon',
      colorMode: 'purple',
      primaryColor: 'red',
      accentColor: '#12345',
      cornerStyle: 'blob',
      density: 'tiny',
      displayName: '   ',
      logoUrl: 'javascript:alert(1)',
    });
    expect(config).toEqual(DEFAULT_THEME_CONFIG);
  });

  it('accepts valid values', () => {
    const config = sanitizeThemeConfig({
      preset: 'royal',
      colorMode: 'dark',
      primaryColor: '#0f766e',
      logoUrl: 'https://cdn.example.com/logo.png',
      displayName: 'Acme CRM',
    });
    expect(config.preset).toBe('royal');
    expect(config.primaryColor).toBe('#0F766E');
    expect(config.logoUrl).toBe('https://cdn.example.com/logo.png');
    expect(config.displayName).toBe('Acme CRM');
  });

  it('tolerates null/undefined', () => {
    expect(sanitizeThemeConfig(null)).toEqual(DEFAULT_THEME_CONFIG);
    expect(sanitizeThemeConfig(undefined)).toEqual(DEFAULT_THEME_CONFIG);
  });
});
