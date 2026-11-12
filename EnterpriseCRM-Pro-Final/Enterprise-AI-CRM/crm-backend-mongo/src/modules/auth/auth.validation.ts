import { z } from 'zod';

/* ============================================================
   REGISTER COMPANY
============================================================ */

export const registerSchema = z.object({
  body: z.object({
    companyName: z
      .string()
      .trim()
      .min(2, 'Company name is too short'),

    ownerName: z
      .string()
      .trim()
      .min(2, 'Name is too short'),

    email: z
      .string()
      .trim()
      .email('Enter a valid email'),

    password: z
      .string()
      .min(8, 'At least 8 characters')
      .max(128, 'At most 128 characters')
      .regex(
        /[A-Z]/,
        'Needs an uppercase letter',
      )
      .regex(
        /[0-9]/,
        'Needs a number',
      ),
  }),
});


/* ============================================================
   EMAIL / PASSWORD LOGIN
============================================================ */

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email('Enter a valid email'),

    password: z
      .string()
      .min(
        1,
        'Password is required',
      )
      .max(128),
  }),
});


/* ============================================================
   GOOGLE LOGIN / REGISTER
============================================================ */

/**
 * The mobile application sends the Google
 * ID token to the backend.
 *
 * Example:
 *
 * POST /auth/google
 *
 * {
 *   "credential": "eyJhbGciOiJSUzI1NiIs..."
 * }
 */

export const googleAuthSchema = z.object({
  body: z.object({
    credential: z
      .string()
      .trim()
      .min(
        1,
        'Google credential is required',
      ),
  }),
});


/* ============================================================
   REFRESH TOKEN
============================================================ */

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z
      .string()
      .min(
        1,
        'refreshToken is required',
      ),
  }),
});


/* ============================================================
   LOGOUT
============================================================ */

export const logoutSchema =
  refreshSchema;


/* ============================================================
   FORGOT / RESET PASSWORD
============================================================ */

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email('Enter a valid email'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z
      .string()
      .trim()
      .min(20, 'Reset token is invalid')
      .max(200),

    password: z
      .string()
      .min(8, 'At least 8 characters')
      .max(128, 'At most 128 characters')
      .regex(/[A-Z]/, 'Needs an uppercase letter')
      .regex(/[0-9]/, 'Needs a number'),
  }),
});
