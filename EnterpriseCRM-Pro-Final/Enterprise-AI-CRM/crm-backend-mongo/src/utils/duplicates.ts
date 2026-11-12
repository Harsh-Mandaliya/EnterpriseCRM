import { Types } from 'mongoose';

import type { AuthUser } from '@/middlewares/auth.middleware';
import { Customer, Lead } from '@/models';
import { ApiError } from '@/utils/apiError';
import { scopeFor, withScope } from '@/utils/scope';

/* ============================================================
   PHONE NORMALISATION
   "+91 98765-43210", "098765 43210" and "9876543210" are the
   same number: compare the last 10 digits.
============================================================ */

export { normalizePhone } from '@/models/shared';
import { normalizePhone } from '@/models/shared';

export function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value ? value : null;
}

/* ============================================================
   DUPLICATE LOOKUP
============================================================ */

export interface DuplicateMatch {
  type: 'lead' | 'customer';
  matchedOn: ('email' | 'phone')[];
  /** Only present for records the caller is allowed to see. */
  id?: string;
  name?: string;
  /** false = exists in the company but belongs to someone else. */
  visible: boolean;
}

/**
 * Finds leads and customers in the caller's company with the
 * same e-mail or phone. Records outside the caller's scope are
 * reported without id or name so nothing leaks.
 */
export async function findDuplicates(
  user: AuthUser,
  input: { email?: string | null; phone?: string | null },
  exclude: { type: 'lead' | 'customer'; id: string } | null = null,
): Promise<DuplicateMatch[]> {
  const email = normalizeEmail(input.email);
  const phoneDigits = normalizePhone(input.phone);

  if (!email && !phoneDigits) return [];

  const or: Record<string, unknown>[] = [];
  if (email) or.push({ email });
  if (phoneDigits) or.push({ phoneDigits });

  const [leadScope, customerScope] = await Promise.all([
    scopeFor(user, 'assignedToId'),
    scopeFor(user, ['ownerId', 'sharedWithIds']),
  ]);

  const sources = [
    { type: 'lead' as const, model: Lead, scope: leadScope },
    { type: 'customer' as const, model: Customer, scope: customerScope },
  ];

  const results: DuplicateMatch[] = [];

  for (const { type, model, scope } of sources) {
    const base: Record<string, unknown> = { companyId: user.companyId, $or: or };
    if (exclude?.type === type) {
      base._id = { $ne: new Types.ObjectId(exclude.id) };
    }

    const [all, visibleIds] = await Promise.all([
      (model as typeof Lead).find(base).select('name email phoneDigits').limit(20).lean(),
      (model as typeof Lead).find(withScope(base, scope)).select('_id').limit(20).lean(),
    ]);

    const visible = new Set(visibleIds.map(doc => doc._id.toString()));

    for (const doc of all) {
      const matchedOn: DuplicateMatch['matchedOn'] = [];
      if (email && doc.email === email) matchedOn.push('email');
      if (phoneDigits && (doc as { phoneDigits?: string }).phoneDigits === phoneDigits) matchedOn.push('phone');

      const isVisible = visible.has(doc._id.toString());
      results.push(
        isVisible
          ? { type, matchedOn, id: doc._id.toString(), name: doc.name, visible: true }
          : { type, matchedOn, visible: false },
      );
    }
  }

  return results;
}

/**
 * Throws 409 with the matches unless the caller explicitly
 * allowed a duplicate.
 */
export async function assertNoDuplicates(
  user: AuthUser,
  input: { email?: string | null; phone?: string | null },
  options: { allowDuplicate?: boolean; exclude?: { type: 'lead' | 'customer'; id: string } } = {},
): Promise<void> {
  if (options.allowDuplicate) return;

  const duplicates = await findDuplicates(user, input, options.exclude ?? null);

  if (duplicates.length > 0) {
    throw ApiError.conflict(
      'A lead or customer with this e-mail or phone already exists.',
      { duplicates },
    );
  }
}
