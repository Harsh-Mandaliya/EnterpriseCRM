import { Types } from 'mongoose';

import {
  Customer,
} from '@/models';

import type { AuthUser } from '@/middlewares/auth.middleware';

import {
  ApiError,
} from '@/utils/apiError';

import {
  hasCompanyWideVisibility,
} from '@/utils/permissions';

import {
  assertSameCompanyRefs,
  scopeFor,
  withScope,
} from '@/utils/scope';

import {
  assertNoDuplicates,
} from '@/utils/duplicates';

/* ============================================================
   SCOPE
   SALES / EMPLOYEE: customers they own or that are shared
   with them. MANAGER: their teams' customers. OWNER / ADMIN:
   all. Customers without an owner (created before ownership
   existed and not backfilled) are visible to company-wide
   roles only.
============================================================ */

const customerScope = (user: AuthUser) =>
  scopeFor(user, ['ownerId', 'sharedWithIds']);

/* ============================================================
   HELPERS
============================================================ */

/**
 * Escape user input before placing it into a RegExp.
 *
 * This prevents characters such as:
 *
 * . * + ? ^ $ ( ) [ ] { } |
 *
 * from becoming regular-expression operators.
 */
function escapeRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
}

/**
 * Keep pagination inside safe limits.
 */
function normalizePagination(
  page: number,
  pageSize: number,
) {
  const safePage =
    Number.isFinite(page) && page > 0
      ? Math.floor(page)
      : 1;

  const safePageSize =
    Number.isFinite(pageSize) &&
    pageSize > 0
      ? Math.min(
          Math.floor(pageSize),
          100,
        )
      : 20;

  return {
    page: safePage,
    pageSize: safePageSize,
  };
}

const POPULATE_OWNER = { path: 'ownerId', select: 'name' };

type LeanCustomer = Record<string, unknown> & {
  _id: Types.ObjectId;
  ownerId?: unknown;
  sharedWithIds?: Types.ObjectId[];
};

/**
 * Lean documents skip the schema's toJSON transform, so the
 * `id` field has to be added here. (Before this, customer list
 * items were returned without any id.)
 */
function toCustomerJson(doc: LeanCustomer) {
  const { _id, __v, phoneDigits, ownerId, sharedWithIds, ...rest } = doc;
  void __v;
  void phoneDigits;

  const populated =
    ownerId && typeof ownerId === 'object' && 'name' in ownerId && '_id' in ownerId
      ? (ownerId as { _id: Types.ObjectId; name: unknown })
      : null;

  const owner = populated
    ? { id: populated._id.toString(), name: String(populated.name) }
    : null;

  return {
    ...rest,
    id: _id.toString(),
    ownerId: owner?.id ?? (ownerId ? String(ownerId) : null),
    owner,
    sharedWithIds: (sharedWithIds ?? []).map(id => id.toString()),
  };
}

function optionalText(value: string | undefined) {
  return value?.trim() || undefined;
}

/* ============================================================
   LIST CUSTOMERS
============================================================ */

export async function listCustomers(
  user: AuthUser,
  params: {
    page: number;
    pageSize: number;
    search?: string;
    ownerId?: string;
  },
) {
  const {
    page,
    pageSize,
  } = normalizePagination(
    params.page,
    params.pageSize,
  );

  const filter: Record<
    string,
    unknown
  > = {
    companyId: user.companyId,
  };

  const search =
    params.search?.trim();

  if (search) {
    const regex =
      new RegExp(
        escapeRegex(
          search.slice(0, 100),
        ),
        'i',
      );

    // name, e-mail, phone, GSTIN or address (e.g. a city)
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
      { gstin: regex },
      { address: regex },
    ];
  }

  if (params.ownerId && Types.ObjectId.isValid(params.ownerId)) {
    filter.ownerId = params.ownerId;
  }

  const scoped =
    withScope(filter, await customerScope(user));

  const skip =
    (page - 1) * pageSize;

  const [
    items,
    total,
  ] = await Promise.all([
    Customer.find(scoped)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate(POPULATE_OWNER)
      .lean(),
    Customer.countDocuments(scoped),
  ]);

  return {
    items: items.map(item => toCustomerJson(item as LeanCustomer)),
    pagination: {
      page,
      pageSize,
      total,
      totalPages:
        Math.max(
          1,
          Math.ceil(
            total / pageSize,
          ),
        ),
    },
  };
}

/* ============================================================
   GET CUSTOMER
============================================================ */

export async function getCustomer(
  user: AuthUser,
  id: string,
) {
  const customer =
    await Customer.findOne(
      withScope(
        { _id: id, companyId: user.companyId },
        await customerScope(user),
      ),
    )
      .populate(POPULATE_OWNER)
      .lean();

  if (!customer) {
    throw ApiError.notFound(
      'Customer not found',
    );
  }

  return toCustomerJson(customer as LeanCustomer);
}

/* ============================================================
   CREATE CUSTOMER
============================================================ */

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  address?: string;
  notes?: string;
  ownerId?: string | null;
  sharedWithIds?: string[];
  allowDuplicate?: boolean;
}

/**
 * Reps (SALES / EMPLOYEE) always own what they create; other
 * roles may assign any company user, defaulting to themselves.
 */
function resolveOwner(user: AuthUser, requested: string | null | undefined) {
  if (!hasCompanyWideVisibility(user.role)) {
    return user.userId;
  }
  return requested === undefined ? user.userId : requested;
}

export async function createCustomer(
  user: AuthUser,
  input: CustomerInput,
) {
  const ownerId = resolveOwner(user, input.ownerId);
  const sharedWithIds = [...new Set(input.sharedWithIds ?? [])];

  await assertSameCompanyRefs(user.companyId, {
    userIds: [ownerId, ...sharedWithIds],
  });

  await assertNoDuplicates(
    user,
    { email: input.email, phone: input.phone },
    { allowDuplicate: input.allowDuplicate },
  );

  const customer =
    await Customer.create({
      companyId: user.companyId,
      name: input.name.trim(),
      email: optionalText(input.email),
      phone: optionalText(input.phone),
      gstin: optionalText(input.gstin)?.toUpperCase(),
      address: optionalText(input.address),
      notes: optionalText(input.notes),
      ownerId,
      sharedWithIds,
    });

  return getCustomer(user, customer._id.toString());
}

/* ============================================================
   UPDATE CUSTOMER
============================================================ */

export async function updateCustomer(
  user: AuthUser,
  id: string,
  input: Partial<CustomerInput>,
) {
  const existing =
    await Customer.findOne(
      withScope(
        { _id: id, companyId: user.companyId },
        await customerScope(user),
      ),
    );

  if (!existing) {
    throw ApiError.notFound(
      'Customer not found',
    );
  }

  // Only company-wide roles or the owner may move or re-share
  // a customer; someone it was merely shared with may not.
  const isOwner = existing.ownerId?.toString() === user.userId;
  const canReassign = hasCompanyWideVisibility(user.role) || isOwner;

  if ((input.ownerId !== undefined || input.sharedWithIds !== undefined) && !canReassign) {
    throw ApiError.forbidden('Only the owner can reassign or share this customer');
  }

  if (input.ownerId !== undefined && !hasCompanyWideVisibility(user.role) && input.ownerId !== user.userId) {
    throw ApiError.forbidden('Ask a manager to transfer this customer to someone else');
  }

  await assertSameCompanyRefs(user.companyId, {
    userIds: [input.ownerId, ...(input.sharedWithIds ?? [])],
  });

  if (input.email !== undefined || input.phone !== undefined) {
    await assertNoDuplicates(
      user,
      {
        email: input.email ?? null,
        phone: input.phone ?? null,
      },
      { allowDuplicate: input.allowDuplicate, exclude: { type: 'customer', id } },
    );
  }

  if (input.name !== undefined) existing.name = input.name.trim();
  if (input.email !== undefined) existing.email = optionalText(input.email);
  if (input.phone !== undefined) existing.phone = optionalText(input.phone);
  if (input.gstin !== undefined) existing.gstin = optionalText(input.gstin)?.toUpperCase();
  if (input.address !== undefined) existing.address = optionalText(input.address);
  if (input.notes !== undefined) existing.notes = optionalText(input.notes);
  if (input.ownerId !== undefined) existing.set('ownerId', input.ownerId);
  if (input.sharedWithIds !== undefined) existing.set('sharedWithIds', [...new Set(input.sharedWithIds)]);

  await existing.save();

  return getCustomer(
    // Re-read with company-wide rights so a rep who just
    // handed the customer over still gets the saved result.
    { ...user, role: 'ADMIN' },
    id,
  );
}

/* ============================================================
   DELETE CUSTOMER
============================================================ */

export async function deleteCustomer(
  user: AuthUser,
  id: string,
) {
  const existing =
    await Customer.findOneAndDelete(
      withScope(
        { _id: id, companyId: user.companyId },
        await customerScope(user),
      ),
    );

  if (!existing) {
    throw ApiError.notFound(
      'Customer not found',
    );
  }
}
