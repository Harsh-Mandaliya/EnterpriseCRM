import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthTokens } from '@/types';

const ACCESS_TOKEN_KEY = 'crm_access_token';
const REFRESH_TOKEN_KEY = 'crm_refresh_token';

const isWeb = Platform.OS === 'web';

/**
 * Store a value.
 *
 * Web:
 *   localStorage
 *
 * Android/iOS:
 *   Expo SecureStore
 */
async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

/**
 * Read a value.
 */
async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(key);
  }

  return await SecureStore.getItemAsync(key);
}

/**
 * Delete a value.
 */
async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

/**
 * Save access + refresh tokens.
 */
export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

/**
 * Get access token.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.warn('[CRM Storage] Failed to read access token:', error);
    return null;
  }
}

/**
 * Get refresh token.
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.warn('[CRM Storage] Failed to read refresh token:', error);
    return null;
  }
}

/**
 * Clear both tokens.
 */
export async function clearTokens(): Promise<void> {
  try {
    await Promise.all([
      deleteItem(ACCESS_TOKEN_KEY),
      deleteItem(REFRESH_TOKEN_KEY),
    ]);
  } catch (error) {
    console.warn('[CRM Storage] Failed to clear tokens:', error);
  }
}

/**
 * Check whether a session exists.
 */
export async function hasStoredSession(): Promise<boolean> {
  const accessToken = await getAccessToken();
  return accessToken !== null;
}
/* ============================================================
   NON-SECRET APP PREFERENCES
   ------------------------------------------------------------
   Small JSON values such as the cached theme and the last
   company code, so the right branding shows instantly on the
   next launch. Never store tokens or personal data here.
============================================================ */

const PREFERENCE_PREFIX = 'crm_pref_';

export async function getPreference<T>(key: string): Promise<T | null> {
  try {
    const raw = await getItem(PREFERENCE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setPreference(key: string, value: unknown): Promise<void> {
  try {
    await setItem(PREFERENCE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn('[CRM Storage] Failed to save preference:', key, error);
  }
}

export async function removePreference(key: string): Promise<void> {
  try {
    await deleteItem(PREFERENCE_PREFIX + key);
  } catch {
    // Missing keys are fine.
  }
}
