import { Company, User } from '@/models';
import {
  uniqueCompanySlug,
  type CompanyBranding,
  type CompanyDoc,
  type ColorMode,
  type CornerStyle,
  type Density,
  type ThemePreset,
} from '@/models/Company.model';

import type { AuthUser } from '@/middlewares/auth.middleware';
import { ApiError } from '@/utils/apiError';
import { audit } from '@/utils/audit';
import {
  CAN_MANAGE_BRANDING,
  type RoleName,
} from '@/utils/permissions';

/* ============================================================
   TYPES
============================================================ */

export interface ResolvedTheme {
  preset: ThemePreset;
  colorMode: ColorMode;
  primaryColor: string | null;
  accentColor: string | null;
  cornerStyle: CornerStyle;
  density: Density;
  displayName: string;
  logoUrl: string | null;
  /** Which layer decided the preset. */
  source: 'user' | 'role' | 'company';
}

const DEFAULT_BRANDING: CompanyBranding = {
  displayName: null,
  logoUrl: null,
  preset: 'classic',
  primaryColor: null,
  accentColor: null,
  cornerStyle: 'rounded',
  density: 'comfortable',
  colorMode: 'system',
  roleThemes: {},
  allowUserThemes: true,
};

/* ============================================================
   HELPERS
============================================================ */

function brandingOf(company: CompanyDoc | { toObject(): CompanyDoc }): CompanyBranding {
  // Work on a plain object: hydrated sub-documents expose Mongoose
  // internals through Object.entries().
  const plain = 'toObject' in company ? company.toObject() : company;
  const stored = plain.branding ?? DEFAULT_BRANDING;

  // Copy only the role entries that are actually set.
  const roleThemes: CompanyBranding['roleThemes'] = {};
  const rawRoleThemes = (stored.roleThemes ?? {}) as Record<string, unknown>;
  for (const [role, preset] of Object.entries(rawRoleThemes)) {
    if (typeof preset === 'string') {
      roleThemes[role as RoleName] = preset as ThemePreset;
    }
  }

  return {
    displayName: stored.displayName ?? null,
    logoUrl: stored.logoUrl ?? null,
    preset: stored.preset ?? DEFAULT_BRANDING.preset,
    primaryColor: stored.primaryColor ?? null,
    accentColor: stored.accentColor ?? null,
    cornerStyle: stored.cornerStyle ?? DEFAULT_BRANDING.cornerStyle,
    density: stored.density ?? DEFAULT_BRANDING.density,
    colorMode: stored.colorMode ?? DEFAULT_BRANDING.colorMode,
    roleThemes,
    allowUserThemes: stored.allowUserThemes ?? true,
  };
}

/**
 * Companies created before branding existed have no slug.
 * Give them one the first time their branding is read.
 */
async function loadCompany(companyId: string) {
  const company = await Company.findById(companyId);

  if (!company) {
    throw ApiError.notFound('Company not found');
  }

  if (!company.slug) {
    company.slug = await uniqueCompanySlug(company.name);
    await company.save();
  }

  return company;
}

/**
 * Resolution order for the preset:
 *   1. the user's own preset (only if the company allows it)
 *   2. the preset the company assigned to the user's role
 *   3. the company preset
 * Colour mode: user choice, otherwise the company default.
 */
export function resolveTheme(
  company: { name: string },
  branding: CompanyBranding,
  role: RoleName,
  preferences: { themePreset: ThemePreset | null; colorMode: ColorMode | null } | null,
): ResolvedTheme {
  let preset = branding.preset;
  let source: ResolvedTheme['source'] = 'company';

  const rolePreset = branding.roleThemes[role];
  if (rolePreset) {
    preset = rolePreset;
    source = 'role';
  }

  if (branding.allowUserThemes && preferences?.themePreset) {
    preset = preferences.themePreset;
    source = 'user';
  }

  // Company colour overrides only apply to the company's own
  // preset, so a personal or role preset looks as designed.
  const useCompanyColors = source === 'company';

  return {
    preset,
    colorMode: preferences?.colorMode ?? branding.colorMode,
    primaryColor: useCompanyColors ? branding.primaryColor : null,
    accentColor: useCompanyColors ? branding.accentColor : null,
    cornerStyle: branding.cornerStyle,
    density: branding.density,
    displayName: branding.displayName || company.name,
    logoUrl: branding.logoUrl,
    source,
  };
}

/* ============================================================
   READ
============================================================ */

export async function getBrandingForUser(user: AuthUser) {
  const [company, account] = await Promise.all([
    loadCompany(user.companyId),
    User.findOne({ _id: user.userId, companyId: user.companyId })
      .select('preferences')
      .lean(),
  ]);

  const branding = brandingOf(company);
  const preferences = {
    themePreset: account?.preferences?.themePreset ?? null,
    colorMode: account?.preferences?.colorMode ?? null,
  };

  return {
    company: {
      id: company._id.toString(),
      name: company.name,
      slug: company.slug,
      timezone: company.timezone,
      locale: company.locale,
      currency: company.currency,
    },
    settings: branding,
    preferences,
    resolved: resolveTheme(company, branding, user.role, preferences),
    canEdit: CAN_MANAGE_BRANDING.includes(user.role),
  };
}

/**
 * Pre-login branding, looked up by company code. Returns only
 * what a login screen needs — never users, settings or ids.
 */
export async function getPublicBranding(slug: string) {
  const company = await Company.findOne({ slug: slug.toLowerCase() });

  if (!company) {
    throw ApiError.notFound('Company code not found');
  }

  const branding = brandingOf(company);

  return {
    slug: company.slug,
    displayName: branding.displayName || company.name,
    logoUrl: branding.logoUrl,
    preset: branding.preset,
    primaryColor: branding.primaryColor,
    accentColor: branding.accentColor,
    cornerStyle: branding.cornerStyle,
    density: branding.density,
    colorMode: branding.colorMode,
  };
}

/* ============================================================
   WRITE
============================================================ */

export type BrandingUpdate = Partial<Omit<CompanyBranding, 'roleThemes'>> & {
  roleThemes?: Partial<Record<RoleName, ThemePreset | null>>;
};

export async function updateBranding(
  actor: AuthUser,
  input: BrandingUpdate,
) {
  const company = await loadCompany(actor.companyId);
  const current = brandingOf(company);

  const next: CompanyBranding = {
    ...current,
    ...Object.fromEntries(
      Object.entries(input).filter(
        ([key, value]) => key !== 'roleThemes' && value !== undefined,
      ),
    ),
  };

  if (input.roleThemes) {
    const roleThemes = { ...current.roleThemes };
    for (const [role, preset] of Object.entries(input.roleThemes)) {
      if (preset) {
        roleThemes[role as RoleName] = preset;
      } else {
        delete roleThemes[role as RoleName];
      }
    }
    next.roleThemes = roleThemes;
  }

  company.set('branding', next);
  await company.save();

  await audit({
    companyId: actor.companyId,
    actorId: actor.userId,
    action: 'company.branding_updated',
    targetType: 'Company',
    targetId: actor.companyId,
    metadata: { fields: Object.keys(input) },
  });

  return getBrandingForUser(actor);
}

export async function updateProfile(
  actor: AuthUser,
  input: {
    name?: string;
    slug?: string;
    timezone?: string;
    locale?: string;
    currency?: string;
  },
) {
  const company = await loadCompany(actor.companyId);

  if (input.slug && input.slug !== company.slug) {
    const taken = await Company.exists({
      slug: input.slug,
      _id: { $ne: company._id },
    });
    if (taken) {
      throw ApiError.conflict('That company code is already in use');
    }
  }

  for (const key of ['name', 'slug', 'timezone', 'locale', 'currency'] as const) {
    if (input[key] !== undefined) {
      company.set(key, input[key]);
    }
  }

  await company.save();

  await audit({
    companyId: actor.companyId,
    actorId: actor.userId,
    action: 'company.profile_updated',
    targetType: 'Company',
    targetId: actor.companyId,
    metadata: { fields: Object.keys(input) },
  });

  return getBrandingForUser(actor);
}

export async function updatePreferences(
  user: AuthUser,
  input: { themePreset?: ThemePreset | null; colorMode?: ColorMode | null },
) {
  const company = await loadCompany(user.companyId);

  if (input.themePreset && !brandingOf(company).allowUserThemes) {
    throw ApiError.forbidden(
      'Your company does not allow personal themes',
    );
  }

  const update: Record<string, unknown> = {};
  if (input.themePreset !== undefined) {
    update['preferences.themePreset'] = input.themePreset;
  }
  if (input.colorMode !== undefined) {
    update['preferences.colorMode'] = input.colorMode;
  }

  await User.updateOne(
    { _id: user.userId, companyId: user.companyId },
    { $set: update },
    { runValidators: true },
  );

  return getBrandingForUser(user);
}
