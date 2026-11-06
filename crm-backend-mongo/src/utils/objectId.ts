import { z } from 'zod';

// MongoDB ObjectIds are 24-character hex strings — this replaces the
// `.uuid()` validator used in the PostgreSQL/Prisma version of this API,
// since Mongo document ids aren't UUIDs.
export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');
