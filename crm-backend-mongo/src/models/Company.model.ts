import { Schema, model, Types } from 'mongoose';
import { applyJsonShape } from '@/models/shared';
import { ROLES, type RoleName } from '@/utils/permissions';

/* ============================================================
   THEME OPTIONS
   ------------------------------------------------------------
   Preset ids must match crm-mobile-expo/src/theme/presets.ts.
============================================================ */

export const THEME_PRESETS = [
  'classic',
  'emerald',
  'sunset',
  'royal',
  'graphite',
] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number];

export const COLOR_MODES = ['light', 'dark', 'system'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const CORNER_STYLES = ['sharp', 'rounded', 'pill'] as const;
export type CornerStyle = (typeof CORNER_STYLES)[number];

export const DENSITIES = ['compact', 'comfortable'] as const;
export type Density = (typeof DENSITIES)[number];

export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/* ============================================================
   DOCUMENT
============================================================ */

export interface CompanyBranding {
  /** Name shown in the app header; falls back to company name. */
  displayName: string | null;
  logoUrl: string | null;
  preset: ThemePreset;
  /** Optional overrides on top of the preset. */
  primaryColor: string | null;
  accentColor: string | null;
  cornerStyle: CornerStyle;
  density: Density;
  /** Default light/dark behaviour for everyone in the company. */
  colorMode: ColorMode;
  /** Optional preset per role, e.g. { SALES: 'emerald' }. */
  roleThemes: Partial<Record<RoleName, ThemePreset>>;
  /** Whether each user may pick their own preset. */
  allowUserThemes: boolean;
}

export interface CompanyBilling {
  legalName: string | null;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  bankDetails: string | null;
}

export interface CompanyDoc {
  _id: Types.ObjectId;
  name: string;
  /** Unique, URL-safe company code used before login. */
  slug: string;
  branding: CompanyBranding;
  timezone: string;
  locale: string;
  currency: string;
  /** Printed on invoices and receipts (v1.4). */
  billing: CompanyBilling;
  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   SCHEMA
============================================================ */

const roleThemesDefinition = Object.fromEntries(
  ROLES.map(role => [
    role,
    { type: String, enum: THEME_PRESETS, required: false },
  ]),
);

const brandingSchema = new Schema<CompanyBranding>(
  {
    displayName: { type: String, trim: true, maxlength: 60, default: null },
    logoUrl: { type: String, trim: true, maxlength: 2048, default: null },
    preset: { type: String, enum: THEME_PRESETS, default: 'classic' },
    primaryColor: { type: String, match: HEX_COLOR, default: null },
    accentColor: { type: String, match: HEX_COLOR, default: null },
    cornerStyle: { type: String, enum: CORNER_STYLES, default: 'rounded' },
    density: { type: String, enum: DENSITIES, default: 'comfortable' },
    colorMode: { type: String, enum: COLOR_MODES, default: 'system' },
    roleThemes: { type: new Schema(roleThemesDefinition, { _id: false }), default: {} },
    allowUserThemes: { type: Boolean, default: true },
  },
  { _id: false },
);

const companySchema = new Schema<CompanyDoc>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/,
    },
    branding: { type: brandingSchema, default: () => ({}) },
    timezone: { type: String, default: 'Asia/Kolkata', maxlength: 64 },
    locale: { type: String, default: 'en-IN', maxlength: 16 },
    currency: { type: String, default: 'INR', match: /^[A-Z]{3}$/ },
    billing: {
      legalName: { type: String, default: null, maxlength: 160 },
      address: { type: String, default: null, maxlength: 400 },
      gstin: { type: String, default: null, maxlength: 15 },
      phone: { type: String, default: null, maxlength: 30 },
      email: { type: String, default: null, maxlength: 254 },
      bankDetails: { type: String, default: null, maxlength: 400 },
    },
  },
  { timestamps: true },
);

applyJsonShape(companySchema);

export const Company = model<CompanyDoc>('Company', companySchema);

/* ============================================================
   SLUG HELPERS
============================================================ */

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '');

  return base.length >= 3 ? base : `company-${base || 'crm'}`;
}

/**
 * Returns a slug derived from the company name that is not yet
 * taken, appending a short random suffix when needed.
 */
export async function uniqueCompanySlug(name: string): Promise<string> {
  const base = slugify(name);

  if (!(await Company.exists({ slug: base }))) {
    return base;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 7);
    const candidate = `${base.slice(0, 33)}-${suffix}`;
    if (!(await Company.exists({ slug: candidate }))) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique company code');
}
