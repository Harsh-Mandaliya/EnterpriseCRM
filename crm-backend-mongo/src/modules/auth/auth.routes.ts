import { Router } from 'express';

import * as authController from '@/modules/auth/auth.controller';

import { requireAuth } from '@/middlewares/auth.middleware';

import { validate } from '@/middlewares/validate.middleware';

import { rateLimit } from '@/middlewares/security.middleware';

import { env } from '@/config/env';

import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/modules/auth/auth.validation';

/* ============================================================
   ROUTER
============================================================ */

const router = Router();

/* ============================================================
   BRUTE-FORCE PROTECTION
   - per IP for every credential endpoint
   - per IP + e-mail for login, so one account can't be
     hammered from a single address
============================================================ */

const authLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax * 5,
});

const loginLimiter = rateLimit({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  key: req =>
    `${req.ip}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: 'Too many sign-in attempts. Please wait and try again.',
});

router.use(authLimiter);

/* ============================================================
   REGISTER COMPANY
============================================================ */

/**
 * Creates:
 *
 * Company
 *    ↓
 * OWNER User
 *
 * Request:
 *
 * POST /auth/register
 *
 * Body:
 * {
 *   companyName,
 *   ownerName,
 *   email,
 *   password
 * }
 */

router.post(
  '/register',
  validate(registerSchema),
  authController.register,
);

/* ============================================================
   EMAIL / PASSWORD LOGIN
============================================================ */

/**
 * Login with:
 *
 * email
 * password
 *
 * Request:
 *
 * POST /auth/login
 *
 * Returns:
 *
 * accessToken
 * refreshToken
 */

router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  authController.login,
);

/* ============================================================
   GOOGLE LOGIN / REGISTER
============================================================ */

/**
 * Google authentication.
 *
 * Existing user:
 *    → Login
 *
 * New user:
 *    → Create Company
 *    → Create OWNER
 *    → Login
 *
 * Request:
 *
 * POST /auth/google
 *
 * Body:
 *
 * {
 *   credential: "GOOGLE_ID_TOKEN"
 * }
 */

router.post(
  '/google',
  validate(googleAuthSchema),
  authController.googleAuth,
);

/* ============================================================
   REFRESH ACCESS TOKEN
============================================================ */

/**
 * Used when access token expires.
 *
 * Request:
 *
 * POST /auth/refresh
 *
 * Body:
 *
 * {
 *   refreshToken: "..."
 * }
 */

router.post(
  '/refresh',
  validate(refreshSchema),
  authController.refresh,
);

/* ============================================================
   LOGOUT
============================================================ */

/**
 * Revokes the refresh token.
 *
 * Request:
 *
 * POST /auth/logout
 *
 * Body:
 *
 * {
 *   refreshToken: "..."
 * }
 */

router.post(
  '/logout',
  validate(logoutSchema),
  authController.logout,
);

/* ============================================================
   LOGOUT EVERYWHERE
============================================================ */

router.post(
  '/logout-all',
  requireAuth,
  authController.logoutAll,
);

/* ============================================================
   FORGOT / RESET PASSWORD
============================================================ */

router.post(
  '/forgot-password',
  loginLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword,
);

/* ============================================================
   CURRENT USER
============================================================ */

/**
 * Returns the currently authenticated user.
 *
 * Request:
 *
 * GET /auth/me
 *
 * Header:
 *
 * Authorization: Bearer ACCESS_TOKEN
 *
 * Returns:
 *
 * id
 * name
 * email
 * role
 * companyId
 * company
 * authProvider
 */

router.get(
  '/me',
  requireAuth,
  authController.me,
);

/* ============================================================
   EXPORT
============================================================ */

export default router;