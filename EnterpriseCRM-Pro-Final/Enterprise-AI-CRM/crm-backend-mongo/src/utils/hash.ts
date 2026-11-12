import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * A valid bcrypt hash of a random string. Login compares against
 * it when the e-mail is unknown so both paths take the same time.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  randomBytes(16).toString('hex'),
  SALT_ROUNDS,
);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
