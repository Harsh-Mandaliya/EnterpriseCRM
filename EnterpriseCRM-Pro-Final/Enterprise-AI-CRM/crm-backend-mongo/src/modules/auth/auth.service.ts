import { createHash, randomBytes, randomUUID } from 'crypto';

import {
  Company,
  User,
  RefreshToken,
  PasswordResetToken,
} from '@/models';

import { uniqueCompanySlug } from '@/models/Company.model';

import {
  hashPassword,
  comparePassword,
  DUMMY_PASSWORD_HASH,
} from '@/utils/hash';

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/utils/jwt';

import { verifyGoogleToken } from '@/utils/google';
import { ApiError } from '@/utils/apiError';
import { audit } from '@/utils/audit';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';

import { getBrandingForUser } from '@/modules/company/company.service';

/* ============================================================
   CONFIG
============================================================ */

const PASSWORD_RESET_TTL_MINUTES = 30;

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/* ============================================================
   TOKEN PAIR
============================================================ */

async function issueTokenPair(
  user: {
    id: string;
    companyId: string;
    role: string;
  },
  familyId: string = randomUUID(),
) {
  const accessToken =
    signAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

  const tokenId =
    randomUUID();

  const refreshToken =
    signRefreshToken({
      userId: user.id,
      tokenId,
    });

  const expiresAt =
    new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      env.jwt.refreshExpiresDays,
  );

  await RefreshToken.create({
    _id: tokenId,
    userId: user.id,
    familyId,
    tokenHash: sha256(refreshToken),
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
  };
}

function tokenSubject(user: {
  _id: { toString(): string };
  companyId: { toString(): string };
  role: string;
}) {
  return {
    id: user._id.toString(),
    companyId: user.companyId.toString(),
    role: user.role,
  };
}

/* ============================================================
   REGISTER COMPANY
============================================================ */

export async function registerCompany(
  input: {
    companyName: string;
    ownerName: string;
    email: string;
    password: string;
  },
) {
  const companyName = input.companyName.trim();
  const ownerName = input.ownerName.trim();
  const email = input.email.trim().toLowerCase();

  /* Request validation (auth.validation.ts) already enforces
     these rules; they are repeated here because this is the
     actual write path. */

  if (companyName.length < 2) {
    throw ApiError.badRequest('Company name is required');
  }

  if (ownerName.length < 2) {
    throw ApiError.badRequest('Owner name is required');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw ApiError.badRequest('Enter a valid email address');
  }

  assertPasswordPolicy(input.password);

  const existing =
    await User.exists({ email });

  if (existing) {
    throw ApiError.conflict(
      'An account with this email already exists',
    );
  }

  const passwordHash =
    await hashPassword(input.password);

  const company =
    await Company.create({
      name: companyName,
      slug: await uniqueCompanySlug(companyName),
    });

  let userId: unknown = null;

  try {
    const user =
      await User.create({
        companyId: company._id,
        name: ownerName,
        email,
        passwordHash,
        authProvider: 'LOCAL',
        role: 'OWNER',
        isActive: true,
        lastLoginAt: new Date(),
      });
    userId = user._id;

    // `await` matters: a failure while issuing tokens must reach
    // the rollback below.
    return await issueTokenPair(tokenSubject(user));
  } catch (err) {
    // Don't leave an orphan company/owner behind if any step failed
    // (e.g. a racing duplicate email or a token write error).
    await rollbackSignup(company._id, userId);
    throw err;
  }
}

async function rollbackSignup(companyId: unknown, userId: unknown) {
  await Promise.all([
    userId ? User.deleteOne({ _id: userId }) : Promise.resolve(),
    Company.deleteOne({ _id: companyId }),
  ]);
}

/* ============================================================
   PASSWORD POLICY
============================================================ */

export function assertPasswordPolicy(password: string) {
  if (password.length < 8) {
    throw ApiError.badRequest('Password must contain at least 8 characters');
  }

  if (password.length > 128) {
    throw ApiError.badRequest('Password must be at most 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    throw ApiError.badRequest('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    throw ApiError.badRequest('Password must contain at least one number');
  }
}

/* ============================================================
   EMAIL / PASSWORD LOGIN
============================================================ */

const INVALID_LOGIN = 'Invalid email or password';

export async function login(
  email: string,
  password: string,
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  // passwordHash has select:false in User.model.ts
  const user =
    await User.findOne({
      email: normalizedEmail,
    }).select('+passwordHash');

  // Always run one bcrypt comparison so response time does
  // not reveal whether the e-mail address exists.
  const valid =
    await comparePassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

  if (!user || !user.passwordHash) {
    if (user && user.authProvider === 'GOOGLE') {
      throw ApiError.unauthorized(
        'This account uses Google Sign-In. Continue with Google.',
      );
    }
    throw ApiError.unauthorized(INVALID_LOGIN);
  }

  if (!valid) {
    throw ApiError.unauthorized(INVALID_LOGIN);
  }

  if (!user.isActive) {
    throw ApiError.forbidden(
      'Your account has been deactivated',
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueTokenPair(tokenSubject(user));
}

/* ============================================================
   GOOGLE AUTHENTICATION
============================================================ */

/**
 * Google Login / Register.
 *
 * 1. Verify the Google ID token on the server (signature,
 *    audience, expiry, verified e-mail)
 * 2. Existing user (by googleId, then e-mail) -> login
 * 3. New user -> create company + OWNER
 */
export async function googleAuth(
  credential: string,
) {
  const google =
    await verifyGoogleToken(credential);

  let user =
    await User.findOne({ googleId: google.googleId });

  if (!user) {
    user = await User.findOne({ email: google.email });
  }

  if (user) {
    if (!user.isActive) {
      throw ApiError.forbidden(
        'Your account has been deactivated',
      );
    }

    if (
      user.googleId &&
      user.googleId !== google.googleId
    ) {
      throw ApiError.conflict(
        'This email is already connected to another Google account',
      );
    }

    if (!user.googleId) {
      user.googleId = google.googleId;
    }

    if (google.picture && user.avatar !== google.picture) {
      user.avatar = google.picture;
    }

    user.lastLoginAt = new Date();
    await user.save();

    return issueTokenPair(tokenSubject(user));
  }

  const companyName =
    `${google.name}'s Company`;

  const company =
    await Company.create({
      name: companyName,
      slug: await uniqueCompanySlug(companyName),
    });

  let newUserId: unknown = null;

  try {
    const created =
      await User.create({
        companyId: company._id,
        name: google.name,
        email: google.email,
        googleId: google.googleId,
        authProvider: 'GOOGLE',
        avatar: google.picture,
        role: 'OWNER',
        isActive: true,
        lastLoginAt: new Date(),
      });
    newUserId = created._id;

    return await issueTokenPair(tokenSubject(created));
  } catch (err) {
    await rollbackSignup(company._id, newUserId);
    throw err;
  }
}

/* ============================================================
   REFRESH TOKEN (ROTATION + REUSE DETECTION)
============================================================ */

const INVALID_REFRESH = 'Invalid or expired refresh token';

export async function refresh(
  refreshToken: string,
) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized(INVALID_REFRESH);
  }

  const stored =
    await RefreshToken.findById(payload.tokenId);

  if (
    !stored ||
    stored.tokenHash !== sha256(refreshToken) ||
    stored.userId.toString() !== payload.userId
  ) {
    throw ApiError.unauthorized(INVALID_REFRESH);
  }

  if (stored.revokedAt) {
    // A rotated token was replayed: assume theft and end every
    // session that descends from the same login.
    await RefreshToken.updateMany(
      { familyId: stored.familyId, revokedAt: null },
      { revokedAt: new Date() },
    );
    logger.warn('Refresh token reuse detected', {
      userId: payload.userId,
    });
    throw ApiError.unauthorized(INVALID_REFRESH);
  }

  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized(INVALID_REFRESH);
  }

  const user =
    await User.findById(payload.userId);

  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  if (!user.isActive) {
    throw ApiError.forbidden(
      'Your account has been deactivated',
    );
  }

  // Atomic revoke: only one concurrent refresh can win.
  const rotated =
    await RefreshToken.updateOne(
      { _id: stored._id, revokedAt: null },
      { revokedAt: new Date() },
    );

  if (rotated.modifiedCount !== 1) {
    throw ApiError.unauthorized(INVALID_REFRESH);
  }

  return issueTokenPair(tokenSubject(user), stored.familyId);
}

/* ============================================================
   LOGOUT
============================================================ */

export async function logout(
  refreshToken: string,
) {
  if (!refreshToken) {
    return;
  }

  try {
    const payload =
      verifyRefreshToken(refreshToken);

    await RefreshToken.updateOne(
      {
        _id: payload.tokenId,
        tokenHash: sha256(refreshToken),
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      },
    );
  } catch {
    // Logout is intentionally idempotent: invalid/expired
    // tokens need no further action.
  }
}

/**
 * Ends every session of the user (all devices).
 */
export async function logoutAll(userId: string) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() },
  );
}

/* ============================================================
   FORGOT / RESET PASSWORD
============================================================ */

/**
 * Always resolves the same way whether or not the e-mail
 * exists, so the endpoint cannot be used to enumerate users.
 *
 * Delivering the reset link requires an e-mail provider, which
 * is not configured in this project. Outside production the
 * link is written to the server log so the flow can be tested;
 * see docs/KNOWN_LIMITATIONS.md.
 */
export async function requestPasswordReset(email: string) {
  const user =
    await User.findOne({
      email: email.trim().toLowerCase(),
      isActive: true,
    });

  if (!user) {
    return;
  }

  // Invalidate earlier unused tokens for this user.
  await PasswordResetToken.updateMany(
    { userId: user._id, usedAt: null },
    { usedAt: new Date() },
  );

  const rawToken =
    randomBytes(32).toString('base64url');

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: sha256(rawToken),
    expiresAt: new Date(
      Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
    ),
  });

  await audit({
    companyId: user.companyId.toString(),
    actorId: user._id.toString(),
    action: 'auth.password_reset_requested',
    targetType: 'User',
    targetId: user._id.toString(),
  });

  if (!env.isProduction && !env.isTest) {
    logger.info(
      `[dev only] Password reset link: ${env.passwordResetUrl}?token=${rawToken}`,
    );
  }

  return rawToken;
}

export async function resetPassword(
  token: string,
  newPassword: string,
) {
  assertPasswordPolicy(newPassword);

  const record =
    await PasswordResetToken.findOneAndUpdate(
      {
        tokenHash: sha256(token),
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { usedAt: new Date() },
    );

  if (!record) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  const user =
    await User.findById(record.userId);

  if (!user || !user.isActive) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  // A password reset ends every existing session.
  await logoutAll(user._id.toString());

  await audit({
    companyId: user.companyId.toString(),
    actorId: user._id.toString(),
    action: 'auth.password_reset',
    targetType: 'User',
    targetId: user._id.toString(),
  });
}

/* ============================================================
   CURRENT USER
============================================================ */

export async function getMe(
  userId: string,
) {
  const user =
    await User.findById(userId);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (!user.isActive) {
    throw ApiError.forbidden(
      'Your account has been deactivated',
    );
  }

  const branding =
    await getBrandingForUser({
      userId,
      companyId: user.companyId.toString(),
      role: user.role,
    });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    companyId: user.companyId.toString(),
    createdAt: user.createdAt,

    company: {
      id: branding.company.id,
      name: branding.company.name,
      slug: branding.company.slug,
    },

    branding,

    preferences: {
      themePreset: user.preferences?.themePreset ?? null,
      colorMode: user.preferences?.colorMode ?? null,
    },

    authProvider: user.authProvider,
  };
}
