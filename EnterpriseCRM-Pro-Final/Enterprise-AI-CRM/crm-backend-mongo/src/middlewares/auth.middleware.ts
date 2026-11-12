import {
  NextFunction,
  Request,
  Response,
} from 'express';

import { verifyAccessToken } from '@/utils/jwt';
import { ApiError } from '@/utils/apiError';
import { User } from '@/models';

import {
  isRole,
  type RoleName,
} from '@/utils/permissions';

/* ============================================================
   AUTHENTICATED USER
   ============================================================ */

/**
 * User information attached to req.user by requireAuth().
 *
 * companyId and role come from the DATABASE, not from the
 * token, so a deactivated user or a role change takes effect
 * on the very next request instead of after the access token
 * expires.
 */
export interface AuthUser {
  userId: string;
  companyId: string;
  role: RoleName;
}

/* ============================================================
   AUTHENTICATED REQUEST
   ============================================================ */

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

/* ============================================================
   JWT PAYLOAD VALIDATION
   ============================================================ */

function isValidAuthPayload(
  payload: unknown,
): payload is {
  userId: string;
  companyId: string;
  role: RoleName;
} {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const data = payload as Record<string, unknown>;

  return (
    typeof data.userId === 'string' &&
    /^[0-9a-fA-F]{24}$/.test(data.userId) &&
    typeof data.companyId === 'string' &&
    data.companyId.trim().length > 0 &&
    isRole(data.role)
  );
}

/* ============================================================
   REQUIRE AUTH
   ============================================================ */

/**
 * Requires a valid JWT access token.
 *
 * Expected header:
 *
 * Authorization: Bearer <access_token>
 *
 * Security responsibilities:
 *
 * 1. Read and extract the Bearer token
 * 2. Verify JWT signature and expiry
 * 3. Validate required JWT fields
 * 4. Re-load the user: must exist, be active, and still
 *    belong to the company named in the token
 * 5. Attach the authoritative user context to req.user
 */
export async function requireAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  const authorization =
    req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith('Bearer ')
  ) {
    return next(
      ApiError.unauthorized(
        'Missing access token',
      ),
    );
  }

  const token =
    authorization
      .substring('Bearer '.length)
      .trim();

  if (!token) {
    return next(
      ApiError.unauthorized(
        'Missing access token',
      ),
    );
  }

  let payload: unknown;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(
      ApiError.unauthorized(
        'Invalid or expired access token',
      ),
    );
  }

  if (!isValidAuthPayload(payload)) {
    return next(
      ApiError.unauthorized(
        'Invalid access token',
      ),
    );
  }

  try {
    const user = await User.findById(payload.userId)
      .select('companyId role isActive')
      .lean();

    if (
      !user ||
      !user.isActive ||
      user.companyId.toString() !== payload.companyId
    ) {
      return next(
        ApiError.unauthorized(
          'Session is no longer valid',
        ),
      );
    }

    req.user = {
      userId: payload.userId,
      companyId: user.companyId.toString(),
      role: user.role,
    };

    return next();
  } catch (err) {
    return next(err);
  }
}
