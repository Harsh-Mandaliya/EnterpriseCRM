import { Schema, model, Types } from 'mongoose';
import { applyJsonShape } from '@/models/shared';

/**
 * Only a SHA-256 hash of each refresh token is stored, so a
 * database leak does not hand out working sessions.
 *
 * `familyId` groups every token produced by rotating one login.
 * If an already-rotated token is presented again (token theft /
 * replay), the whole family is revoked.
 */
export interface RefreshTokenDoc {
  _id: string; // matches the tokenId embedded in the refresh JWT itself
  userId: Types.ObjectId;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false },
);

// MongoDB removes expired token records automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

applyJsonShape(refreshTokenSchema);

export const RefreshToken = model<RefreshTokenDoc>(
  'RefreshToken',
  refreshTokenSchema,
);
