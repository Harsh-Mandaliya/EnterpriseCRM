import {
  Request,
  Response,
  NextFunction,
} from 'express';

import * as authService from '@/modules/auth/auth.service';

import { AuthedRequest } from '@/middlewares/auth.middleware';

/* ============================================================
   REGISTER COMPANY
   Creates:
   - Company
   - OWNER user
   - Access token
   - Refresh token
============================================================ */

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tokens = await authService.registerCompany(
      req.body,
    );

    return res.status(201).json(tokens);
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   LOGIN
============================================================ */

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const email = String(req.body.email)
      .trim()
      .toLowerCase();

    const password = String(req.body.password);

    const companyCode =
      typeof req.body.companyCode === 'string' && req.body.companyCode
        ? req.body.companyCode
        : undefined;

    const tokens = await authService.login(
      email,
      password,
      companyCode,
    );

    return res.status(200).json(tokens);
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   GOOGLE LOGIN / REGISTER
============================================================ */

/**
 * Google authentication.
 *
 * Expected body:
 *
 * {
 *   credential: string
 * }
 *
 * The service should:
 *
 * 1. Verify Google credential
 * 2. Find existing user
 * 3. If user exists -> login
 * 4. If user does not exist -> create account
 * 5. Return access + refresh tokens
 *
 * IMPORTANT:
 * The exact service function must exist in auth.service.ts.
 */

export async function googleAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { credential, companyCode } = req.body;

    const tokens =
      await authService.googleAuth(
        credential,
        companyCode || undefined,
      );

    return res.status(200).json(tokens);
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   REFRESH TOKEN
============================================================ */

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const refreshToken =
      String(req.body.refreshToken);

    const tokens =
      await authService.refresh(
        refreshToken,
      );

    return res.status(200).json(tokens);
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   LOGOUT
============================================================ */

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const refreshToken =
      String(req.body.refreshToken);

    await authService.logout(
      refreshToken,
    );

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   CURRENT USER
============================================================ */

/**
 * Requires:
 *
 * Authorization: Bearer <access-token>
 *
 * requireAuth middleware attaches:
 *
 * req.user = {
 *   userId,
 *   companyId,
 *   role
 * }
 */

export async function me(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const user =
      await authService.getMe(
        req.user.userId,
      );

    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   LOGOUT EVERYWHERE
============================================================ */

export async function logoutAll(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    await authService.logoutAll(req.user!.userId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   FORGOT PASSWORD
   Always 202 — never reveals whether the e-mail exists.
============================================================ */

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await authService.requestPasswordReset(String(req.body.email));
    return res.status(202).json({
      message: 'If that e-mail has an account, a reset link has been sent.',
    });
  } catch (err) {
    return next(err);
  }
}

/* ============================================================
   RESET PASSWORD
============================================================ */

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await authService.resetPassword(
      String(req.body.token),
      String(req.body.password),
    );
    return res.status(200).json({ message: 'Password updated. Please sign in.' });
  } catch (err) {
    return next(err);
  }
}
