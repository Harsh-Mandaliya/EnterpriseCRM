import { z } from 'zod';

import {
  COLOR_MODES,
  CORNER_STYLES,
  DENSITIES,
  HEX_COLOR,
  THEME_PRESETS,
} from '@/models/Company.model';
import { ROLES } from '@/utils/permissions';

const preset = z.enum(THEME_PRESETS);
const hexColor = z.string().regex(HEX_COLOR, 'Use a 6-digit hex colour like #2563EB');

const logoUrl = z
  .string()
  .trim()
  .max(2048)
  .url('Enter a valid URL')
  .refine(
    value => value.startsWith('https://'),
    'Logo URL must use https://',
  );

// Intl accepts canonical names and aliases (Asia/Kolkata and
// Asia/Calcutta) and throws RangeError for unknown zones.
function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const roleThemes = z
  .object(
    Object.fromEntries(
      ROLES.map(role => [role, preset.nullable().optional()]),
    ) as Record<(typeof ROLES)[number], z.ZodOptional<z.ZodNullable<typeof preset>>>,
  )
  .strict();

export const updateBrandingSchema = z.object({
  body: z
    .object({
      displayName: z.string().trim().min(2).max(60).nullable().optional(),
      logoUrl: logoUrl.nullable().optional(),
      preset: preset.optional(),
      primaryColor: hexColor.nullable().optional(),
      accentColor: hexColor.nullable().optional(),
      cornerStyle: z.enum(CORNER_STYLES).optional(),
      density: z.enum(DENSITIES).optional(),
      colorMode: z.enum(COLOR_MODES).optional(),
      roleThemes: roleThemes.optional(),
      allowUserThemes: z.boolean().optional(),
    })
    .strict(),
});

export const updateCompanyProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(
          /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/,
          '3–40 characters: letters, numbers and dashes',
        )
        .optional(),
      timezone: z
        .string()
        .refine(
          isTimeZone,
          'Unknown time zone',
        )
        .optional(),
      locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Use a locale like en-IN').optional(),
      currency: z.string().regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO currency code').optional(),
    })
    .strict(),
});

export const updatePreferencesSchema = z.object({
  body: z
    .object({
      themePreset: preset.nullable().optional(),
      colorMode: z.enum(COLOR_MODES).nullable().optional(),
    })
    .strict(),
});

export const publicBrandingSchema = z.object({
  params: z.object({
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/, 'Invalid company code'),
  }),
});
