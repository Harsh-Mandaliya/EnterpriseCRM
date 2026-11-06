import { Schema, model, Types } from 'mongoose';
import { applyJsonShape } from '@/models/shared';

/**
 * One-time password reset token. Only the SHA-256 hash is
 * stored; the raw token is delivered to the user out of band.
 * Tokens expire after 30 minutes and are single-use.
 */
export interface PasswordResetTokenDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

applyJsonShape(passwordResetTokenSchema);

export const PasswordResetToken = model<PasswordResetTokenDoc>(
  'PasswordResetToken',
  passwordResetTokenSchema,
);
