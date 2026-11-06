import { describe, expect, it } from '@jest/globals';

import brandingReducer, {
  saveCompanyBranding,
} from '@/redux/slices/brandingSlice';
import { login, logout } from '@/redux/slices/authSlice';
import type { BrandingResponse, Me } from '@/types';

const branding = {
  company: { id: 'c1', name: 'Acme', slug: 'acme', timezone: 'Asia/Kolkata', locale: 'en-IN', currency: 'INR' },
  settings: {} as BrandingResponse['settings'],
  preferences: { themePreset: null, colorMode: null },
  resolved: { preset: 'emerald' } as BrandingResponse['resolved'],
  canEdit: true,
} as BrandingResponse;

const me = {
  id: 'u1',
  name: 'Olivia',
  email: 'o@example.test',
  role: 'OWNER',
  companyId: 'c1',
  createdAt: '2026-01-01',
  company: { id: 'c1', name: 'Acme' },
  branding,
} as Me;

const initial = brandingReducer(undefined, { type: '@@init' });

describe('brandingSlice', () => {
  it('takes branding from /auth/me after login', () => {
    const state = brandingReducer(initial, login.fulfilled(me, 'req', { email: 'x', password: 'y' }));
    expect(state.data?.resolved.preset).toBe('emerald');
  });

  it('clears the previous company branding on logout', () => {
    const signedIn = brandingReducer(initial, login.fulfilled(me, 'req', { email: 'x', password: 'y' }));
    const signedOut = brandingReducer(signedIn, logout.pending('req'));
    expect(signedOut.data).toBeNull();
  });

  it('stores the saved branding and a success notice', () => {
    const saving = brandingReducer(initial, saveCompanyBranding.pending('req', { preset: 'royal' }));
    expect(saving.isSaving).toBe(true);

    const saved = brandingReducer(
      saving,
      saveCompanyBranding.fulfilled({ ...branding, resolved: { ...branding.resolved, preset: 'royal' } }, 'req', { preset: 'royal' }),
    );
    expect(saved.isSaving).toBe(false);
    expect(saved.data?.resolved.preset).toBe('royal');
    expect(saved.notice).toMatch(/saved/i);
  });

  it('keeps the server error message on failure', () => {
    const failed = brandingReducer(
      initial,
      saveCompanyBranding.rejected(null, 'req', { preset: 'royal' }, 'You do not have permission to do this'),
    );
    expect(failed.error).toBe('You do not have permission to do this');
  });
});
