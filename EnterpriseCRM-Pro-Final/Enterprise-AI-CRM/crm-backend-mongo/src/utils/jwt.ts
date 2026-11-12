import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '@/config/env';

export interface AccessTokenPayload {
  userId: string;
  companyId: string;
  role: string;
}

export function signAccessToken(
  payload: AccessTokenPayload,
): string {
  return jwt.sign(
    payload,
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.accessExpiresIn,
    } as SignOptions,
  );
}

export function verifyAccessToken(
  token: string,
): AccessTokenPayload {
  const decoded = jwt.verify(
    token,
    env.jwt.accessSecret,
  );

  if (
    typeof decoded !== 'object' ||
    !decoded ||
    typeof decoded.userId !== 'string' ||
    typeof decoded.companyId !== 'string' ||
    typeof decoded.role !== 'string'
  ) {
    throw new Error('Invalid access token payload');
  }

  return decoded as AccessTokenPayload;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export function signRefreshToken(
  payload: RefreshTokenPayload,
): string {
  return jwt.sign(
    payload,
    env.jwt.refreshSecret,
    {
      expiresIn: env.jwt.refreshExpiresIn,
    } as SignOptions,
  );
}

export function verifyRefreshToken(
  token: string,
): RefreshTokenPayload {
  const decoded = jwt.verify(
    token,
    env.jwt.refreshSecret,
  );

  if (
    typeof decoded !== 'object' ||
    !decoded ||
    typeof decoded.userId !== 'string' ||
    typeof decoded.tokenId !== 'string'
  ) {
    throw new Error('Invalid refresh token payload');
  }

  return decoded as RefreshTokenPayload;
}