import dotenv from 'dotenv';

dotenv.config();

/* ============================================================
   HELPERS
============================================================ */

function required(key: string): string {
  const value = process.env[key];

  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${key}`,
    );
  }

  return value.trim();
}

function optional(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function numberOr(key: string, fallback: number): number {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const nodeEnv =
  process.env.NODE_ENV ??
  'development';

const isProduction = nodeEnv === 'production';

/* ============================================================
   SECRET STRENGTH
   ------------------------------------------------------------
   Short or shared JWT secrets make tokens forgeable. Production
   refuses to start with weak secrets; development only warns.
============================================================ */

function jwtSecret(key: string): string {
  const value = required(key);

  if (value.length < 32) {
    const message = `${key} must be at least 32 characters`;
    if (isProduction) throw new Error(message);
    console.warn(`[warn] ${message} (allowed outside production)`);
  }

  return value;
}

const accessSecret = jwtSecret('JWT_ACCESS_SECRET');
const refreshSecret = jwtSecret('JWT_REFRESH_SECRET');

if (accessSecret === refreshSecret) {
  throw new Error(
    'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
  );
}

const corsOrigin =
  process.env.CORS_ORIGIN?.trim() ||
  (isProduction ? '' : '*');

if (isProduction && (corsOrigin === '' || corsOrigin === '*')) {
  throw new Error(
    'CORS_ORIGIN must list explicit origins in production',
  );
}

/* ============================================================
   ENVIRONMENT CONFIG
============================================================ */

export const env = {
  nodeEnv,

  isProduction,

  isTest: nodeEnv === 'test',

  port:
    Number(process.env.PORT ?? 4000),

  /** Number of proxy hops to trust for req.ip (0 = none). */
  trustProxy:
    Number(process.env.TRUST_PROXY ?? 0),

  mongoUri:
    required('MONGODB_URI'),

  corsOrigin,

  jwt: {
    accessSecret,

    refreshSecret,

    accessExpiresIn:
      process.env.JWT_ACCESS_EXPIRES_IN ??
      '15m',

    refreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN ??
      '30d',

    refreshExpiresDays:
      numberOr('JWT_REFRESH_EXPIRES_DAYS', 30),
  },

  /**
   * Google sign-in is optional: when GOOGLE_CLIENT_ID is unset
   * the /auth/google endpoint answers 503 instead of the whole
   * server refusing to start.
   */
  google: {
    clientId:
      optional('GOOGLE_CLIENT_ID'),
  },

  /** Base URL of the app's reset-password page/deep link. */
  passwordResetUrl:
    optional('PASSWORD_RESET_URL') ??
    'crmmobile://reset-password',

  rateLimit: {
    authWindowMs: numberOr('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    authMax: numberOr('AUTH_RATE_LIMIT_MAX', 20),
    apiWindowMs: numberOr('API_RATE_LIMIT_WINDOW_MS', 60 * 1000),
    apiMax: numberOr('API_RATE_LIMIT_MAX', 300),
  },
} as const;
