import { apiClient } from '@/api/client';
import { AuthTokens, Me } from '@/types';

export async function register(input: {
  companyName: string;
  ownerName: string;
  email: string;
  password: string;
}): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>(
    '/auth/register',
    input,
  );

  return data;
}

export async function login(
  email: string,
  password: string,
  companyCode?: string | null,
): Promise<AuthTokens> {
  const code = companyCode?.trim().toLowerCase();
  const { data } = await apiClient.post<AuthTokens>(
    '/auth/login',
    {
      email: email.trim().toLowerCase(),
      password,
      // On a company's login page only that company's people may sign in.
      ...(code ? { companyCode: code } : {}),
    },
  );

  return data;
}

export async function logout(
  refreshToken: string,
): Promise<void> {
  await apiClient.post('/auth/logout', {
    refreshToken,
  });
}

export async function me(): Promise<Me> {
  const { data } = await apiClient.get<Me>('/auth/me');

  return data;
}
/** Always succeeds (the server never reveals whether the e-mail exists). */
export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', {
    email: email.trim().toLowerCase(),
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await apiClient.post('/auth/reset-password', {
    token: token.trim(),
    password,
  });
}
