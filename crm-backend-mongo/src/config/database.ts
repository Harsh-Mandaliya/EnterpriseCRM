import mongoose from 'mongoose';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

mongoose.set('strictQuery', true);

/**
 * Indexes from older releases that break the current schema.
 * v1.0 replaced the plaintext `token` field on refresh tokens with
 * `tokenHash`; the old unique `token_1` index then rejects every
 * new token (all missing `token` values collide), so sign-in fails
 * with 409 until it is dropped. Dropping it is always safe.
 */
const LEGACY_INDEXES: { collection: string; index: string }[] = [
  { collection: 'refreshtokens', index: 'token_1' },
];

export async function dropLegacyIndexes(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  for (const { collection, index } of LEGACY_INDEXES) {
    try {
      const exists = await db
        .listCollections({ name: collection })
        .hasNext();
      if (!exists) continue;

      const indexes = await db.collection(collection).indexes();
      if (indexes.some(i => i.name === index)) {
        await db.collection(collection).dropIndex(index);
        logger.warn(`Dropped legacy index ${collection}.${index} (run "npm run migrate" to finish upgrading)`);
      }
    } catch (err) {
      logger.error(`Could not check legacy index ${collection}.${index}`, err);
    }
  }
}

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('error', err => {
    logger.error('MongoDB connection error:', err);
  });

  await mongoose.connect(env.mongoUri);
  logger.info('Connected to MongoDB');

  await dropLegacyIndexes();
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
