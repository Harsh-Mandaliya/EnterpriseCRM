import { describe, expect, it } from '@jest/globals';

import {
  buildBrandingUpdate,
  previewConfig,
  validateCompanyDraft,
  type CompanyDraft,
} from '@/screens/settings/useThemeSettingsForm';
import type { BrandingResponse, CompanyBrandingSettings } from '@/types';

const settings: CompanyBrandingSettings = {
  displayName: null,
  logoUrl: null,
  preset: 'classic',
  primaryColor: '#123456',
  accentColor: null,
  cornerStyle: 'rounded',
  density: 'comfortable',
  colorMode: 'system',
  roleThemes: { SALES: 'emerald' },
  allowUserThemes: true,
};

const branding: BrandingResponse = {
  company: { id: 'c1', name: 'Acme', slug: 'acme', timezone: 'Asia/Kolkata', locale: 'en-IN', currency: 'INR' },
  settings,
  preferences: { themePreset: null, colorMode: null },
  resolved: {
    preset: 'classic',
    colorMode: 'system',
    primaryColor: '#123456',
    accentColor: null,
    cornerStyle: 'rounded',
    density: 'comfortable',
    displayName: 'Acme',
    logoUrl: null,
    source: 'company',
  },
  canEdit: true,
};

const draft = (overrides: Partial<CompanyDraft> = {}): CompanyDraft => ({
  displayName: '',
  logoUrl: '',
  preset: 'classic',
  primaryColor: '#123456',
  accentColor: '',
  cornerStyle: 'rounded',
  density: 'comfortable',
  colorMode: 'system',
  roleThemes: { SALES: 'emerald' },
  allowUserThemes: true,
  ...overrides,
});

describe('validateCompanyDraft', () => {
  it('accepts an untouched draft', () => {
    expect(validateCompanyDraft(draft())).toEqual({});
  });

  it('rejects insecure logo links and malformed colours', () => {
    const errors = validateCompanyDraft(
      draft({ logoUrl: 'http://x.com/logo.png', primaryColor: '#12', accentColor: 'blue', displayName: 'A' }),
    );
    expect(Object.keys(errors).sort()).toEqual(['accentColor', 'displayName', 'logoUrl', 'primaryColor']);
  });
});

describe('buildBrandingUpdate', () => {
  it('sends nothing when nothing changed', () => {
    expect(buildBrandingUpdate(settings, draft())).toEqual({});
  });

  it('sends only changed fields and clears empty values with null', () => {
    const update = buildBrandingUpdate(
      settings,
      draft({ preset: 'royal', primaryColor: '', roleThemes: { MANAGER: 'sunset' } }),
    );
    expect(update).toEqual({
      preset: 'royal',
      primaryColor: null,
      roleThemes: { SALES: null, MANAGER: 'sunset' },
    });
  });
});

describe('previewConfig', () => {
  it('mirrors the server resolution order: user → role → company', () => {
    expect(previewConfig(branding, draft(), { themePreset: null, colorMode: null }, 'MANAGER', 'me').preset).toBe('classic');
    expect(previewConfig(branding, draft(), { themePreset: null, colorMode: null }, 'SALES', 'me').preset).toBe('emerald');
    expect(previewConfig(branding, draft(), { themePreset: 'royal', colorMode: 'dark' }, 'SALES', 'me')).toMatchObject({
      preset: 'royal',
      colorMode: 'dark',
      primaryColor: null,
    });
  });

  it('ignores the personal preset when the company disallows it, and in role previews', () => {
    const locked = draft({ allowUserThemes: false });
    expect(previewConfig(branding, locked, { themePreset: 'royal', colorMode: null }, 'MANAGER', 'me').preset).toBe('classic');
    expect(previewConfig(branding, draft(), { themePreset: 'royal', colorMode: null }, 'MANAGER', 'company').preset).toBe('classic');
  });

  it('uses the company name when no display name is set', () => {
    expect(previewConfig(branding, draft(), { themePreset: null, colorMode: null }, 'OWNER', 'me').displayName).toBe('Acme');
  });
});
