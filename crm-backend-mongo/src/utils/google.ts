import { OAuth2Client } from 'google-auth-library';

import { env } from '@/config/env';
import { ApiError } from '@/utils/apiError';

const googleClient = env.google.clientId
  ? new OAuth2Client(env.google.clientId)
  : null;

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Verifies a Google ID token server-side: signature, issuer,
 * expiry and that the audience is this app's client id. Only
 * verified Google e-mail addresses are accepted.
 */
export async function verifyGoogleToken(
  idToken: string,
): Promise<GoogleUser> {
  if (!googleClient || !env.google.clientId) {
    throw new ApiError(
      503,
      'Google sign-in is not configured on this server',
    );
  }

  if (!idToken) {
    throw ApiError.badRequest('Google ID token is required');
  }

  let payload;

  try {
    const ticket =
      await googleClient.verifyIdToken({
        idToken,
        audience: env.google.clientId,
      });

    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Invalid Google credential');
  }

  if (!payload || !payload.sub || !payload.email) {
    throw ApiError.unauthorized('Invalid Google credential');
  }

  if (payload.email_verified === false) {
    throw ApiError.unauthorized('Google e-mail address is not verified');
  }

  return {
    googleId: payload.sub,
    email: payload.email
      .trim()
      .toLowerCase(),

    name:
      payload.name ||
      payload.email.split('@')[0],

    picture:
      payload.picture,
  };
}
