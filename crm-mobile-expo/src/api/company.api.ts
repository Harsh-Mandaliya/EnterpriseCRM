import { apiClient } from '@/api/client';

import type {
  BrandingResponse,
  BrandingUpdate,
  CompanyProfileUpdate,
  PublicBranding,
  UserThemePreferences,
} from '@/types';

/* ============================================================
   COMPANY BRANDING API
============================================================ */

/** GET /company/branding — branding + resolved theme for me. */
export async function getBranding(): Promise<BrandingResponse> {
  const { data } = await apiClient.get<BrandingResponse>('/company/branding');
  return data;
}

/** PATCH /company/branding — OWNER / ADMIN only. */
export async function updateBranding(
  update: BrandingUpdate,
): Promise<BrandingResponse> {
  const { data } = await apiClient.patch<BrandingResponse>(
    '/company/branding',
    update,
  );
  return data;
}

/** PATCH /company/profile — OWNER only. */
export async function updateCompanyProfile(
  update: CompanyProfileUpdate,
): Promise<BrandingResponse> {
  const { data } = await apiClient.patch<BrandingResponse>(
    '/company/profile',
    update,
  );
  return data;
}

/** PATCH /company/preferences — any signed-in user. */
export async function updateMyThemePreferences(
  update: Partial<UserThemePreferences>,
): Promise<BrandingResponse> {
  const { data } = await apiClient.patch<BrandingResponse>(
    '/company/preferences',
    update,
  );
  return data;
}

/** GET /company/public/:slug — no auth, used on the login screen. */
export async function getPublicBranding(
  companyCode: string,
): Promise<PublicBranding> {
  const { data } = await apiClient.get<PublicBranding>(
    `/company/public/${encodeURIComponent(companyCode.trim().toLowerCase())}`,
  );
  return data;
}
