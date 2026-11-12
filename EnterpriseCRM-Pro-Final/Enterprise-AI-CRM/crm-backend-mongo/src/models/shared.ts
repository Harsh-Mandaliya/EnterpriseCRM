import { Schema } from 'mongoose';

// Applied to every schema so documents serialize the same shape the
// Prisma/PostgreSQL version of this API returned: an `id` string field
// instead of Mongo's `_id`/`__v`. Controllers, and the whole frontend,
// depend on that shape and stay unchanged because of this.
export function applyJsonShape(schema: Schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id.toString();
      delete ret._id;
    },
  });
  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id.toString();
      delete ret._id;
    },
  });
}

/** Last 10 digits of a phone number, or null (see utils/duplicates.ts). */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}
