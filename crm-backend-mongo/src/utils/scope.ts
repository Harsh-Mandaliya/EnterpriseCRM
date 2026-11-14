import { Types } from 'mongoose';

import type { AuthUser } from '@/middlewares/auth.middleware';
import { ApiError } from '@/utils/apiError';
import { Customer, Invoice, Lead, Opportunity, Team, User } from '@/models';

/* ============================================================
   RECORD OWNERSHIP SCOPE
   ------------------------------------------------------------
   Every query is already filtered by the companyId taken from
   the verified user. On top of that:

     OWNER / ADMIN      every record in the company
     MANAGER            records owned by the members of the
                        teams they manage (plus their own).
                        A manager who leads no team keeps
                        company-wide visibility (pre-teams
                        behaviour) — assign a team to restrict.
     SALES / EMPLOYEE   only records they own / are assigned

   The returned filter is merged into every list / get / update /
   delete query, so a guessed id outside the scope returns 404.
============================================================ */

/**
 * User ids whose records `user` may see, or null for "everyone
 * in the company".
 */
export async function visibleUserIds(
  user: AuthUser,
): Promise<Types.ObjectId[] | null> {
  const self = new Types.ObjectId(user.userId);

  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return null;
  }

  if (user.role === 'MANAGER') {
    const teams = await Team.find({
      companyId: user.companyId,
      managerId: self,
    })
      .select('memberIds')
      .lean();

    if (teams.length === 0) {
      return null;
    }

    const ids = new Map<string, Types.ObjectId>([[self.toString(), self]]);
    for (const team of teams) {
      for (const member of team.memberIds) {
        ids.set(member.toString(), member);
      }
    }
    return [...ids.values()];
  }

  return [self];
}

/**
 * Builds the scope filter for the given owner field(s). With
 * several fields a record matches if ANY of them is visible
 * (e.g. customers: ownerId OR sharedWithIds).
 */
export async function scopeFor(
  user: AuthUser,
  ownerFields: string | string[],
): Promise<Record<string, unknown>> {
  const ids = await visibleUserIds(user);

  if (ids === null) {
    return {};
  }

  const fields = Array.isArray(ownerFields) ? ownerFields : [ownerFields];
  const clauses = fields.map(field => ({ [field]: { $in: ids } }));

  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

/**
 * Combines a base filter with a scope without clobbering keys
 * (both may use $or or the same owner field).
 */
export function withScope(
  filter: Record<string, unknown>,
  scope: Record<string, unknown>,
): Record<string, unknown> {
  return Object.keys(scope).length === 0 ? filter : { $and: [filter, scope] };
}

/* ============================================================
   CROSS-TENANT REFERENCE CHECK
   ------------------------------------------------------------
   Request bodies may reference other documents (customerId,
   assignedToId, ownerId, leadId). Without this check a user
   could attach a record to a customer or user from another
   company and then read its name back through populate().
============================================================ */

type RefCheck = {
  customerId?: unknown;
  leadId?: unknown;
  opportunityId?: unknown;
  userIds?: unknown[];
};

async function assertExists(
  model: {
    exists(filter: Record<string, unknown>): PromiseLike<unknown>;
  },
  companyId: string,
  id: unknown,
  label: string,
) {
  if (id === undefined || id === null || id === '') return;

  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest(`Invalid ${label}`);
  }

  const found = await model.exists({ _id: id, companyId });

  if (!found) {
    throw ApiError.badRequest(`${label} not found in your company`);
  }
}

export async function assertSameCompanyRefs(
  companyId: string,
  refs: RefCheck,
): Promise<void> {
  await Promise.all([
    assertExists(Customer, companyId, refs.customerId, 'Customer'),
    assertExists(Lead, companyId, refs.leadId, 'Lead'),
    assertExists(Opportunity, companyId, refs.opportunityId, 'Opportunity'),
    ...(refs.userIds ?? []).map(id =>
      assertExists(User, companyId, id, 'User'),
    ),
  ]);
}

/* ============================================================
   INVOICE / PAYMENT SCOPE
   An invoice is visible when the caller may see its customer
   or created it. Payments follow their invoice.
============================================================ */

export async function invoiceScope(
  user: AuthUser,
): Promise<Record<string, unknown>> {
  const ids = await visibleUserIds(user);
  if (ids === null) return {};

  const customerIds = await Customer.find({
    companyId: user.companyId,
    $or: [{ ownerId: { $in: ids } }, { sharedWithIds: { $in: ids } }],
  }).distinct('_id');

  return {
    $or: [{ createdById: { $in: ids } }, { customerId: { $in: customerIds } }],
  };
}

export async function paymentScope(
  user: AuthUser,
): Promise<Record<string, unknown>> {
  const scope = await invoiceScope(user);
  if (Object.keys(scope).length === 0) return {};

  const invoiceIds = await Invoice.find({ companyId: user.companyId, ...scope }).distinct('_id');
  return { invoiceId: { $in: invoiceIds } };
}

/* ============================================================
   TASK / ACTIVITY SCOPE (v1.4)
   OWNER / ADMIN see every task; a team manager sees tasks
   assigned to or created by the team; SALES / EMPLOYEE see the
   tasks assigned to them or that they created.
============================================================ */

export async function activityScope(
  user: AuthUser,
): Promise<Record<string, unknown>> {
  const ids = await visibleUserIds(user);
  if (ids === null) return {};
  return {
    // General team tasks (no assignee) are open to everyone.
    $or: [{ assignedToId: { $in: ids } }, { createdById: { $in: ids } }, { assignedToId: null }],
  };
}

/* ============================================================
   CALENDAR VISIBILITY (v1.4)
   Events created by OWNER / ADMIN are company events and visible
   to everyone. Otherwise a user sees events created by people in
   their scope (own / team) and events they are invited to.
============================================================ */

export async function eventVisibilityScope(
  user: AuthUser,
): Promise<Record<string, unknown>> {
  const ids = await visibleUserIds(user);
  if (ids === null) return {};
  const leaders = await User.find({
    companyId: user.companyId,
    role: { $in: ['OWNER', 'ADMIN'] },
  }).distinct('_id');
  return {
    $or: [
      { createdById: { $in: [...ids, ...leaders] } },
      { attendeeIds: new Types.ObjectId(user.userId) },
    ],
  };
}
