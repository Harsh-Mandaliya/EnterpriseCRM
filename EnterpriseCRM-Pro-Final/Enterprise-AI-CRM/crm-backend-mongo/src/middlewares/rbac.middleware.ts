import {
  NextFunction,
  Response,
} from 'express';

import {
  AuthedRequest,
} from '@/middlewares/auth.middleware';

import {
  ApiError,
} from '@/utils/apiError';

import type {
  RoleName,
} from '@/utils/permissions';

/* ============================================================
   REQUIRE ROLE
============================================================ */

/**
 * Restricts a route to specific CRM roles.
 *
 * IMPORTANT:
 * requireAuth MUST run before requireRole.
 *
 * Example:
 *
 * router.delete(
 *   '/:id',
 *   requireAuth,
 *   requireRole('OWNER', 'ADMIN'),
 *   handler,
 * );
 *
 * Role groups live in utils/permissions.ts; prefer those over
 * listing role names inline.
 */
export function requireRole(
  ...allowedRoles: RoleName[]
) {
  return (
    req: AuthedRequest,
    _res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return next(
        ApiError.unauthorized(
          'Authentication required',
        ),
      );
    }

    if (
      !allowedRoles.includes(
        req.user.role,
      )
    ) {
      return next(
        ApiError.forbidden(
          'You do not have permission to do this',
        ),
      );
    }

    return next();
  };
}
