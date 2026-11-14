import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

const mockPost = jest.fn<(url: string, body: unknown) => Promise<{ data: unknown }>>();
jest.mock('@/api/client', () => ({
  apiClient: { post: (url: string, body: unknown) => mockPost(url, body) },
  getApiErrorMessage: (e: unknown) => String(e),
}));

import * as authApi from '@/api/auth.api';
import brandingReducer, { loadPublicBranding } from '@/redux/slices/brandingSlice';
import { login, register } from '@/redux/slices/authSlice';
import {
  forgetOtherCompanyCode,
  getPreference,
  PRE_LOGIN_KEY,
  setPreference,
} from '@/storage/secureStorage';
import type { Me, PublicBranding } from '@/types';

const preLogin = { slug: 'sg-textiles', displayName: 'SG Textiles' } as PublicBranding;
const meOf = (slug: string) =>
  ({ id: 'u1', name: 'A', email: 'a@x.test', role: 'OWNER', companyId: 'c1', createdAt: '', company: { id: 'c1', name: 'X', slug } }) as Me;
const args = { email: 'a@x.test', password: 'p' };

beforeEach(() => {
  mockStore.clear();
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r' } });
});

describe('company code at sign-in', () => {
  it('sends the login page company code, trimmed and lower-case', async () => {
    await authApi.login(' A@X.test ', 'p', '  SG-Textiles ');
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'a@x.test', password: 'p', companyCode: 'sg-textiles' });
  });

  it('sends no company code when none is chosen', async () => {
    await authApi.login('a@x.test', 'p', null);
    await authApi.login('a@x.test', 'p', '  ');
    for (const call of mockPost.mock.calls) expect(call[1]).toEqual({ email: 'a@x.test', password: 'p' });
  });

  it('keeps the login page company when the same company signs in', () => {
    const withCode = brandingReducer(undefined, loadPublicBranding.fulfilled(preLogin, 'r', 'sg-textiles'));
    const after = brandingReducer(withCode, login.fulfilled(meOf('sg-textiles'), 'r', args));
    expect(after.preLogin?.slug).toBe('sg-textiles');
  });

  it('drops a different company from the login page after sign-in or registration', () => {
    const withCode = brandingReducer(undefined, loadPublicBranding.fulfilled(preLogin, 'r', 'sg-textiles'));
    expect(brandingReducer(withCode, login.fulfilled(meOf('nova-electronics'), 'r', args)).preLogin).toBeNull();
    const reg = { companyName: 'New', ownerName: 'N', email: 'n@x.test', password: 'P' };
    expect(brandingReducer(withCode, register.fulfilled(meOf('new-co'), 'r', reg)).preLogin).toBeNull();
  });

  it('forgets a remembered company code that belongs to another company', async () => {
    await setPreference(PRE_LOGIN_KEY, preLogin);
    expect(await forgetOtherCompanyCode('sg-textiles')).toBe(false);
    expect(await getPreference(PRE_LOGIN_KEY)).toEqual(preLogin);
    expect(await forgetOtherCompanyCode('nova-electronics')).toBe(true);
    expect(await getPreference(PRE_LOGIN_KEY)).toBeNull();
    expect(await forgetOtherCompanyCode(undefined)).toBe(false);
  });
});
