import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';

import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
} from '@/storage/secureStorage';

import { Platform } from 'react-native';

import type { AuthTokens, DuplicateMatch } from '@/types';

/**
 * ============================================================
 * CRM API CONFIGURATION
 * ============================================================
 *
 * Set EXPO_PUBLIC_API_URL in crm-mobile-expo/.env (see
 * .env.example and docs/ENVIRONMENT.md), e.g.
 *
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api/v1
 *
 * IMPORTANT:
 * A physical phone must use your computer's LAN IP —
 * `localhost` on a phone is the phone itself.
 *
 * Without the variable the app falls back to the address that
 * reaches a backend on this computer from a simulator/emulator
 * or the web build (Android emulator: 10.0.2.2).
 */
const DEFAULT_API_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:4000/api/v1'
    : 'http://localhost:4000/api/v1';

/**
 * The environment variable takes priority over the default.
 */

const ENV_API_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim();

export const BASE_URL =
  ENV_API_URL && ENV_API_URL.length > 0
    ? ENV_API_URL.replace(/\/+$/, '')
    : DEFAULT_API_URL;

/**
 * ============================================================
 * DEVELOPMENT LOGGING
 * ============================================================
 */

if (__DEV__ && process.env.NODE_ENV !== 'test') {
  console.log('========================================');
  console.log('[CRM API]');
  console.log('BASE URL:', BASE_URL);
  console.log('========================================');

  if (!ENV_API_URL) {
    console.warn(
      '[CRM API] EXPO_PUBLIC_API_URL is not configured.',
    );

    console.warn(
      '[CRM API] Using default:',
      DEFAULT_API_URL,
    );
  }
}

/**
 * ============================================================
 * AXIOS CLIENT
 * ============================================================
 */

export const apiClient = axios.create({
  baseURL: BASE_URL,

  timeout: 15000,

  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * ============================================================
 * SESSION EXPIRED HANDLER
 * ============================================================
 */

let onSessionExpired:
  | (() => void)
  | null = null;

export function setOnSessionExpired(
  handler: (() => void) | null,
): void {
  onSessionExpired = handler;
}

/**
 * ============================================================
 * REQUEST INTERCEPTOR
 * ============================================================
 *
 * Automatically adds:
 *
 * Authorization: Bearer <accessToken>
 */

apiClient.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig,
  ) => {
    try {
      const accessToken =
        await getAccessToken();

      if (accessToken) {
        /**
         * Axios v1 uses AxiosHeaders internally.
         */
        config.headers.set(
          'Authorization',
          `Bearer ${accessToken}`,
        );
      }
    } catch (storageError) {
      if (__DEV__) {
        console.warn(
          '[CRM API] Could not read access token:',
          storageError,
        );
      }
    }

    if (__DEV__) {
      const requestUrl =
        `${BASE_URL}${config.url ?? ''}`;

      console.log(
        '[CRM API REQUEST]',
        config.method?.toUpperCase(),
        requestUrl,
      );
    }

    return config;
  },

  error => {
    return Promise.reject(error);
  },
);

/**
 * ============================================================
 * RETRY CONFIG
 * ============================================================
 */

interface RetriableConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

/**
 * ============================================================
 * REFRESH TOKEN CONTROL
 * ============================================================
 *
 * If multiple API calls return 401 at the same time,
 * only ONE refresh request will be sent.
 */

let refreshPromise:
  | Promise<AuthTokens>
  | null = null;

/**
 * ============================================================
 * RESPONSE INTERCEPTOR
 * ============================================================
 */

apiClient.interceptors.response.use(

  /**
   * ==========================================================
   * SUCCESS RESPONSE
   * ==========================================================
   */

  response => {
    if (__DEV__) {
      console.log(
        '[CRM API RESPONSE]',
        response.status,
        response.config.method?.toUpperCase(),
        response.config.url,
      );
    }

    return response;
  },

  /**
   * ==========================================================
   * ERROR RESPONSE
   * ==========================================================
   */

  async (error: AxiosError) => {

    const original =
      error.config as
        | RetriableConfig
        | undefined;

    /**
     * ========================================================
     * DEVELOPMENT ERROR LOGGING
     * ========================================================
     */

    if (__DEV__) {
      console.log(
        '========================================',
      );

      console.log(
        '[CRM API ERROR]',
      );

      console.log(
        'URL:',
        error.config?.url,
      );

      console.log(
        'METHOD:',
        error.config?.method?.toUpperCase(),
      );

      console.log(
        'STATUS:',
        error.response?.status,
      );

      console.log(
        'MESSAGE:',
        error.message,
      );

      console.log(
        'DATA:',
        error.response?.data,
      );

      console.log(
        '========================================',
      );
    }

    /**
     * ========================================================
     * NETWORK ERROR
     * ========================================================
     *
     * No HTTP response means the request did not reach the
     * backend successfully.
     */

    if (!error.response) {

      if (__DEV__) {

        console.warn(
          '[CRM API] No response from backend.',
        );

        console.warn(
          '[CRM API] Check:',
        );

        console.warn(
          '1. Backend is running.',
        );

        console.warn(
          '2. Phone and PC are on the same network.',
        );

        console.warn(
          '3. Windows Firewall allows port 4000.',
        );

        console.warn(
          '4. Android can open:',
        );

        console.warn(
          `${BASE_URL}/health`,
        );
      }

      return Promise.reject(error);
    }

    /**
     * ========================================================
     * ONLY HANDLE HTTP 401
     * ========================================================
     *
     * All other errors are returned to the caller.
     */

    if (
      error.response.status !== 401 ||
      !original ||
      original._retry
    ) {
      return Promise.reject(error);
    }

    /**
     * ========================================================
     * PREVENT INFINITE RETRY
     * ========================================================
     */

    original._retry = true;

    /**
     * ========================================================
     * GET REFRESH TOKEN
     * ========================================================
     */

    let refreshToken: string | null = null;

    try {

      refreshToken =
        await getRefreshToken();

    } catch (storageError) {

      if (__DEV__) {
        console.warn(
          '[CRM API] Failed to read refresh token:',
          storageError,
        );
      }
    }

    /**
     * ========================================================
     * NO REFRESH TOKEN
     * ========================================================
     */

    if (!refreshToken) {

      if (__DEV__) {
        console.warn(
          '[CRM API] No refresh token available.',
        );
      }

      await clearTokens();

      onSessionExpired?.();

      return Promise.reject(error);
    }

    /**
     * ========================================================
     * REFRESH ACCESS TOKEN
     * ========================================================
     *
     * IMPORTANT:
     *
     * Use plain axios here instead of apiClient.
     *
     * This prevents the refresh request itself from entering
     * the 401 interceptor again.
     */

    try {

      /**
       * ======================================================
       * CREATE REFRESH REQUEST
       * ======================================================
       *
       * If another request is already refreshing the token,
       * reuse the same Promise.
       */

      if (!refreshPromise) {

        refreshPromise = axios
          .post<AuthTokens>(
            `${BASE_URL}/auth/refresh`,

            {
              refreshToken,
            },

            {
              timeout: 15000,

              headers: {
                'Content-Type':
                  'application/json',

                Accept:
                  'application/json',
              },
            },
          )

          .then(response => {

            if (__DEV__) {
              console.log(
                '[CRM API] Token refresh successful.',
              );
            }

            return response.data;
          })

          .finally(() => {

            refreshPromise = null;

          });
      }

      /**
       * ======================================================
       * WAIT FOR REFRESH REQUEST
       * ======================================================
       */

      const tokens =
        await refreshPromise;

      /**
       * ======================================================
       * VALIDATE REFRESH RESPONSE
       * ======================================================
       */

      if (
        !tokens ||
        !tokens.accessToken
      ) {

        throw new Error(
          'Invalid token refresh response.',
        );
      }

      /**
       * ======================================================
       * SAVE NEW TOKENS
       * ======================================================
       */

      await saveTokens(tokens);

      /**
       * ======================================================
       * ATTACH NEW ACCESS TOKEN
       * ======================================================
       *
       * Axios v1 uses AxiosHeaders.set().
       */

      if (!original.headers) {
        original.headers =
          new AxiosHeaders();
      }

      original.headers.set(
        'Authorization',
        `Bearer ${tokens.accessToken}`,
      );

      if (__DEV__) {
        console.log(
          '[CRM API] Retrying original request.',
        );
      }

      /**
       * ======================================================
       * RETRY ORIGINAL REQUEST
       * ======================================================
       */

      return apiClient(original);

    } catch (refreshError) {

      /**
       * ======================================================
       * REFRESH FAILED
       * ======================================================
       */

      if (__DEV__) {

        console.error(
          '[CRM API] Token refresh failed:',
          refreshError,
        );
      }

      /**
       * ======================================================
       * CLEAR INVALID SESSION
       * ======================================================
       */

      try {
        await clearTokens();
      } catch (clearError) {

        if (__DEV__) {
          console.warn(
            '[CRM API] Failed to clear tokens:',
            clearError,
          );
        }
      }

      /**
       * ======================================================
       * RETURN USER TO LOGIN
       * ======================================================
       */

      onSessionExpired?.();

      return Promise.reject(
        refreshError,
      );
    }
  },
);
/**
 * ============================================================
 * ERROR MESSAGE
 * ============================================================
 *
 * Turns any thrown value into a message safe to show the user:
 * the server's `error` field, a network hint, or a fallback.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: unknown } | undefined;

    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error;
    }

    if (!error.response) {
      return 'Cannot reach the server. Check your connection.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/**
 * Returns the duplicate matches when the server rejected a save
 * because the e-mail/phone already exists (409 with details),
 * otherwise null. Callers can then offer "save anyway".
 */
export function getDuplicateMatches(
  error: unknown,
): DuplicateMatch[] | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) {
    return null;
  }

  const data = error.response.data as
    | { details?: { duplicates?: DuplicateMatch[] } }
    | undefined;

  return Array.isArray(data?.details?.duplicates)
    ? data.details.duplicates
    : null;
}

/** Human summary of duplicate matches for a confirmation prompt. */
export function describeDuplicates(
  matches: DuplicateMatch[],
): string {
  const lines = matches.slice(0, 3).map(match => {
    const what = match.type === 'lead' ? 'Lead' : 'Customer';
    const on = match.matchedOn.join(' & ');
    return match.visible && match.name
      ? `• ${what} “${match.name}” (same ${on})`
      : `• A ${what.toLowerCase()} owned by a colleague (same ${on})`;
  });

  if (matches.length > 3) {
    lines.push(`• …and ${matches.length - 3} more`);
  }

  return lines.join('\n');
}
