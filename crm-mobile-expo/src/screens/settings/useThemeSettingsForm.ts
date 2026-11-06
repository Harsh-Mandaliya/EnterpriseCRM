import { useCallback, useEffect, useMemo, useState } from 'react';

import { HEX_PATTERN } from '@/screens/settings/components/ColorField';

import type {
  BrandingResponse,
  BrandingUpdate,
  CompanyBrandingSettings,
  Role,
  ThemeColorMode,
  ThemePresetName,
  UserThemePreferences,
} from '@/types';
import type { ThemeConfig } from '@/theme/types';

/* ============================================================
   FORM STATE
   Draft copies of the saved settings. Nothing is applied to the
   app until the user saves; the preview renders the draft.
============================================================ */

export interface CompanyDraft {
  displayName: string;
  logoUrl: string;
  preset: ThemePresetName;
  primaryColor: string;
  accentColor: string;
  cornerStyle: CompanyBrandingSettings['cornerStyle'];
  density: CompanyBrandingSettings['density'];
  colorMode: ThemeColorMode;
  roleThemes: Partial<Record<Role, ThemePresetName>>;
  allowUserThemes: boolean;
}

export interface PersonalDraft {
  themePreset: ThemePresetName | null;
  colorMode: ThemeColorMode | null;
}

export type CompanyErrors = Partial<Record<'displayName' | 'logoUrl' | 'primaryColor' | 'accentColor', string>>;

function companyDraftFrom(settings: CompanyBrandingSettings): CompanyDraft {
  return {
    displayName: settings.displayName ?? '',
    logoUrl: settings.logoUrl ?? '',
    preset: settings.preset,
    primaryColor: settings.primaryColor ?? '',
    accentColor: settings.accentColor ?? '',
    cornerStyle: settings.cornerStyle,
    density: settings.density,
    colorMode: settings.colorMode,
    roleThemes: { ...settings.roleThemes },
    allowUserThemes: settings.allowUserThemes,
  };
}

export function validateCompanyDraft(draft: CompanyDraft): CompanyErrors {
  const errors: CompanyErrors = {};

  const name = draft.displayName.trim();
  if (name.length > 0 && (name.length < 2 || name.length > 60)) {
    errors.displayName = 'Use 2–60 characters, or leave empty to use the company name.';
  }

  const logo = draft.logoUrl.trim();
  if (logo.length > 0) {
    if (!/^https:\/\/[^\s]+$/i.test(logo)) {
      errors.logoUrl = 'Logo must be a secure https:// link.';
    } else if (logo.length > 2048) {
      errors.logoUrl = 'Link is too long.';
    }
  }

  if (draft.primaryColor && !HEX_PATTERN.test(draft.primaryColor)) {
    errors.primaryColor = 'Use a 6-digit hex colour like #2563EB.';
  }
  if (draft.accentColor && !HEX_PATTERN.test(draft.accentColor)) {
    errors.accentColor = 'Use a 6-digit hex colour like #7C3AED.';
  }

  return errors;
}

/** Only the fields that changed, in the API's shape. */
export function buildBrandingUpdate(
  saved: CompanyBrandingSettings,
  draft: CompanyDraft,
): BrandingUpdate {
  const update: BrandingUpdate = {};
  const nullable = (value: string) => (value.trim().length > 0 ? value.trim() : null);

  if (nullable(draft.displayName) !== saved.displayName) update.displayName = nullable(draft.displayName);
  if (nullable(draft.logoUrl) !== saved.logoUrl) update.logoUrl = nullable(draft.logoUrl);
  if (draft.preset !== saved.preset) update.preset = draft.preset;
  if (nullable(draft.primaryColor) !== saved.primaryColor) update.primaryColor = nullable(draft.primaryColor);
  if (nullable(draft.accentColor) !== saved.accentColor) update.accentColor = nullable(draft.accentColor);
  if (draft.cornerStyle !== saved.cornerStyle) update.cornerStyle = draft.cornerStyle;
  if (draft.density !== saved.density) update.density = draft.density;
  if (draft.colorMode !== saved.colorMode) update.colorMode = draft.colorMode;
  if (draft.allowUserThemes !== saved.allowUserThemes) update.allowUserThemes = draft.allowUserThemes;

  const roles: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE'];
  const roleChanges: BrandingUpdate['roleThemes'] = {};
  for (const role of roles) {
    if ((draft.roleThemes[role] ?? null) !== (saved.roleThemes[role] ?? null)) {
      roleChanges[role] = draft.roleThemes[role] ?? null;
    }
  }
  if (Object.keys(roleChanges).length > 0) update.roleThemes = roleChanges;

  return update;
}

/**
 * The theme a given role would see with the current drafts —
 * mirrors resolveTheme() on the server.
 */
export function previewConfig(
  branding: BrandingResponse,
  company: CompanyDraft | null,
  personal: PersonalDraft,
  role: Role,
  previewAs: 'me' | 'company',
): ThemeConfig {
  const settings = company ?? companyDraftFrom(branding.settings);

  let preset = settings.preset;
  let source: 'company' | 'role' | 'user' = 'company';
  if (settings.roleThemes[role]) {
    preset = settings.roleThemes[role]!;
    source = 'role';
  }
  if (previewAs === 'me' && settings.allowUserThemes && personal.themePreset) {
    preset = personal.themePreset;
    source = 'user';
  }

  const useCompanyColors = source === 'company';

  return {
    preset,
    colorMode: (previewAs === 'me' ? personal.colorMode : null) ?? settings.colorMode,
    primaryColor: useCompanyColors && HEX_PATTERN.test(settings.primaryColor) ? settings.primaryColor : null,
    accentColor: useCompanyColors && HEX_PATTERN.test(settings.accentColor) ? settings.accentColor : null,
    cornerStyle: settings.cornerStyle,
    density: settings.density,
    displayName: settings.displayName.trim() || branding.company.name,
    logoUrl: /^https:\/\//.test(settings.logoUrl.trim()) ? settings.logoUrl.trim() : null,
  };
}

/* ============================================================
   HOOK
============================================================ */

export function useThemeSettingsForm(branding: BrandingResponse | null) {
  const [company, setCompany] = useState<CompanyDraft | null>(null);
  const [personal, setPersonal] = useState<PersonalDraft>({ themePreset: null, colorMode: null });
  const [companyCode, setCompanyCode] = useState('');

  // (Re)initialise drafts whenever fresh data arrives from the server.
  useEffect(() => {
    if (!branding) return;
    setCompany(companyDraftFrom(branding.settings));
    setPersonal({ ...branding.preferences });
    setCompanyCode(branding.company.slug);
  }, [branding]);

  const companyErrors = useMemo(() => (company ? validateCompanyDraft(company) : {}), [company]);

  const companyUpdate = useMemo(
    () => (branding && company ? buildBrandingUpdate(branding.settings, company) : {}),
    [branding, company],
  );

  const personalUpdate = useMemo<Partial<UserThemePreferences>>(() => {
    if (!branding) return {};
    const update: Partial<UserThemePreferences> = {};
    if (personal.colorMode !== branding.preferences.colorMode) update.colorMode = personal.colorMode;
    if (personal.themePreset !== branding.preferences.themePreset) update.themePreset = personal.themePreset;
    return update;
  }, [branding, personal]);

  const updateCompany = useCallback(<K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) => {
    setCompany(current => (current ? { ...current, [key]: value } : current));
  }, []);

  const setRoleTheme = useCallback((role: Role, preset: ThemePresetName | null) => {
    setCompany(current => {
      if (!current) return current;
      const roleThemes = { ...current.roleThemes };
      if (preset) roleThemes[role] = preset;
      else delete roleThemes[role];
      return { ...current, roleThemes };
    });
  }, []);

  const resetCompanyDraft = useCallback(() => {
    if (branding) setCompany(companyDraftFrom(branding.settings));
  }, [branding]);

  return {
    company,
    personal,
    setPersonal,
    companyCode,
    setCompanyCode,
    companyErrors,
    companyUpdate,
    personalUpdate,
    updateCompany,
    setRoleTheme,
    resetCompanyDraft,
    hasCompanyChanges: Object.keys(companyUpdate).length > 0,
    hasPersonalChanges: Object.keys(personalUpdate).length > 0,
    companyValid: Object.keys(companyErrors).length === 0,
  };
}
