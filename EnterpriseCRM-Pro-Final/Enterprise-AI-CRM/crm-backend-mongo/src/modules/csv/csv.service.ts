import { z } from 'zod';

import { Customer, Lead, User } from '@/models';
import type { AuthUser } from '@/middlewares/auth.middleware';
import { ApiError } from '@/utils/apiError';
import { audit } from '@/utils/audit';
import { parseCsv, rowsToRecords, toCsv } from '@/utils/csv';
import { normalizeEmail, normalizePhone } from '@/utils/duplicates';
import { hasCompanyWideVisibility } from '@/utils/permissions';
import { scopeFor, withScope } from '@/utils/scope';

export const MAX_IMPORT_ROWS = 1000;
const MAX_EXPORT_ROWS = 10000;

/* ============================================================
   TYPES
============================================================ */

export interface ImportRowError {
  /** 1-based line number in the file (header is line 1). */
  row: number;
  message: string;
}

export interface ImportResult {
  dryRun: boolean;
  total: number;
  created: number;
  skippedDuplicates: number;
  failed: number;
  errors: ImportRowError[];
}

/* ============================================================
   HELPERS
============================================================ */

const optional = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform(value => (value && value.length > 0 ? value : undefined));

const LEAD_SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'SOCIAL_MEDIA', 'EVENT', 'OTHER'] as const;
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'LOST'] as const;

const upper = (value: string | undefined) => value?.trim().toUpperCase().replace(/[\s-]+/g, '_');

const leadRowSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  email: optional(254).refine(v => v === undefined || z.string().email().safeParse(v).success, 'email is invalid'),
  phone: optional(30),
  source: optional(30)
    .transform(upper)
    .refine(v => v === undefined || (LEAD_SOURCES as readonly string[]).includes(v), `source must be one of ${LEAD_SOURCES.join(', ')}`),
  status: optional(30)
    .transform(upper)
    .refine(v => v === undefined || (LEAD_STATUSES as readonly string[]).includes(v), `status must be one of ${LEAD_STATUSES.join(', ')}`),
  assignedtoemail: optional(254),
});

const customerRowSchema = z.object({
  name: z.string().min(2, 'name must have at least 2 characters').max(200),
  email: optional(254).refine(v => v === undefined || z.string().email().safeParse(v).success, 'email is invalid'),
  phone: optional(30),
  gstin: optional(15),
  address: optional(500),
  notes: optional(2000),
  owneremail: optional(254),
});

function parseFile(csv: string) {
  let rows: string[][];
  try {
    rows = parseCsv(csv);
  } catch (err) {
    throw ApiError.badRequest(`Could not read CSV: ${err instanceof Error ? err.message : 'invalid file'}`);
  }

  const { header, records } = rowsToRecords(rows);

  if (!header.includes('name')) {
    throw ApiError.badRequest('The first row must be a header with at least a "name" column');
  }
  if (records.length === 0) {
    throw ApiError.badRequest('The file has no data rows');
  }
  if (records.length > MAX_IMPORT_ROWS) {
    throw ApiError.badRequest(`Import at most ${MAX_IMPORT_ROWS} rows at a time`);
  }

  return records;
}

/** Maps e-mail → user id for this company (for owner/assignee columns). */
async function companyUsersByEmail(companyId: string) {
  const users = await User.find({ companyId, isActive: true }).select('email').lean();
  return new Map(users.map(u => [u.email.toLowerCase(), u._id.toString()]));
}

/**
 * E-mails and phone digits already present in the company, so
 * imports skip duplicates without one query per row.
 */
async function existingContacts(companyId: string) {
  const [leads, customers] = await Promise.all([
    Lead.find({ companyId }).select('email phoneDigits').lean(),
    Customer.find({ companyId }).select('email phoneDigits').lean(),
  ]);
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const doc of [...leads, ...customers]) {
    if (doc.email) emails.add(doc.email.toLowerCase());
    if (doc.phoneDigits) phones.add(doc.phoneDigits);
  }
  return { emails, phones };
}

function zodMessage(error: z.ZodError) {
  return error.issues.map(issue => `${issue.path.join('.') || 'row'}: ${issue.message}`).join('; ');
}

/* ============================================================
   IMPORT LEADS
============================================================ */

export async function importLeads(
  user: AuthUser,
  input: { csv: string; dryRun?: boolean; allowDuplicates?: boolean },
): Promise<ImportResult> {
  const records = parseFile(input.csv);
  const usersByEmail = await companyUsersByEmail(user.companyId);
  const { emails, phones } = await existingContacts(user.companyId);
  const companyWide = hasCompanyWideVisibility(user.role);

  const result: ImportResult = {
    dryRun: Boolean(input.dryRun),
    total: records.length,
    created: 0,
    skippedDuplicates: 0,
    failed: 0,
    errors: [],
  };

  const toCreate: Record<string, unknown>[] = [];

  records.forEach((record, index) => {
    const line = index + 2;
    const parsed = leadRowSchema.safeParse(record);

    if (!parsed.success) {
      result.failed += 1;
      result.errors.push({ row: line, message: zodMessage(parsed.error) });
      return;
    }

    const row = parsed.data;
    let assignedToId: string | null = companyWide ? null : user.userId;

    if (row.assignedtoemail) {
      const match = usersByEmail.get(row.assignedtoemail.toLowerCase());
      if (!match) {
        result.failed += 1;
        result.errors.push({ row: line, message: `assignedToEmail ${row.assignedtoemail} is not an active user in your company` });
        return;
      }
      if (!companyWide && match !== user.userId) {
        result.failed += 1;
        result.errors.push({ row: line, message: 'You can only import leads assigned to yourself' });
        return;
      }
      assignedToId = match;
    }

    const email = normalizeEmail(row.email);
    const phoneDigits = normalizePhone(row.phone);
    const duplicate = (email && emails.has(email)) || (phoneDigits && phones.has(phoneDigits));

    if (duplicate && !input.allowDuplicates) {
      result.skippedDuplicates += 1;
      result.errors.push({ row: line, message: 'Skipped: a lead or customer with this e-mail or phone already exists' });
      return;
    }

    // Duplicates inside the same file count too.
    if (email) emails.add(email);
    if (phoneDigits) phones.add(phoneDigits);

    toCreate.push({
      companyId: user.companyId,
      name: row.name,
      email: email ?? undefined,
      phone: row.phone,
      source: row.source ?? 'OTHER',
      status: row.status ?? 'NEW',
      assignedToId,
    });
  });

  if (!input.dryRun && toCreate.length > 0) {
    // create() (not insertMany) so validation and the phone
    // normalisation hook run for every document.
    await Lead.create(toCreate);
  }
  result.created = toCreate.length;

  if (!input.dryRun) {
    await audit({
      companyId: user.companyId,
      actorId: user.userId,
      action: 'lead.imported',
      targetType: 'Lead',
      metadata: { created: result.created, failed: result.failed, skipped: result.skippedDuplicates },
    });
  }

  return result;
}

/* ============================================================
   IMPORT CUSTOMERS
============================================================ */

export async function importCustomers(
  user: AuthUser,
  input: { csv: string; dryRun?: boolean; allowDuplicates?: boolean },
): Promise<ImportResult> {
  const records = parseFile(input.csv);
  const usersByEmail = await companyUsersByEmail(user.companyId);
  const { emails, phones } = await existingContacts(user.companyId);
  const companyWide = hasCompanyWideVisibility(user.role);

  const result: ImportResult = {
    dryRun: Boolean(input.dryRun),
    total: records.length,
    created: 0,
    skippedDuplicates: 0,
    failed: 0,
    errors: [],
  };

  const toCreate: Record<string, unknown>[] = [];

  records.forEach((record, index) => {
    const line = index + 2;
    const parsed = customerRowSchema.safeParse(record);

    if (!parsed.success) {
      result.failed += 1;
      result.errors.push({ row: line, message: zodMessage(parsed.error) });
      return;
    }

    const row = parsed.data;
    let ownerId = user.userId;

    if (row.owneremail) {
      const match = usersByEmail.get(row.owneremail.toLowerCase());
      if (!match) {
        result.failed += 1;
        result.errors.push({ row: line, message: `ownerEmail ${row.owneremail} is not an active user in your company` });
        return;
      }
      if (!companyWide && match !== user.userId) {
        result.failed += 1;
        result.errors.push({ row: line, message: 'You can only import customers you own' });
        return;
      }
      ownerId = match;
    }

    const email = normalizeEmail(row.email);
    const phoneDigits = normalizePhone(row.phone);
    const duplicate = (email && emails.has(email)) || (phoneDigits && phones.has(phoneDigits));

    if (duplicate && !input.allowDuplicates) {
      result.skippedDuplicates += 1;
      result.errors.push({ row: line, message: 'Skipped: a lead or customer with this e-mail or phone already exists' });
      return;
    }

    if (email) emails.add(email);
    if (phoneDigits) phones.add(phoneDigits);

    toCreate.push({
      companyId: user.companyId,
      name: row.name,
      email: email ?? undefined,
      phone: row.phone,
      gstin: row.gstin?.toUpperCase(),
      address: row.address,
      notes: row.notes,
      ownerId,
    });
  });

  if (!input.dryRun && toCreate.length > 0) {
    await Customer.create(toCreate);
  }
  result.created = toCreate.length;

  if (!input.dryRun) {
    await audit({
      companyId: user.companyId,
      actorId: user.userId,
      action: 'customer.imported',
      targetType: 'Customer',
      metadata: { created: result.created, failed: result.failed, skipped: result.skippedDuplicates },
    });
  }

  return result;
}

/* ============================================================
   EXPORT
   Exports only what the caller is allowed to see.
============================================================ */

interface PopulatedName {
  name?: string;
  email?: string;
}

export async function exportLeads(user: AuthUser): Promise<{ csv: string; count: number }> {
  const scope = await scopeFor(user, 'assignedToId');
  const leads = await Lead.find(withScope({ companyId: user.companyId }, scope))
    .populate({ path: 'assignedToId', select: 'name email' })
    .populate({ path: 'customerId', select: 'name' })
    .sort({ createdAt: -1 })
    .limit(MAX_EXPORT_ROWS)
    .lean();

  const csv = toCsv(
    ['name', 'email', 'phone', 'source', 'status', 'score', 'assignedTo', 'assignedToEmail', 'customer', 'createdAt'],
    leads.map(lead => {
      const assignee = lead.assignedToId as unknown as PopulatedName | null;
      const customer = lead.customerId as unknown as PopulatedName | null;
      return [
        lead.name,
        lead.email,
        lead.phone,
        lead.source,
        lead.status,
        lead.score,
        assignee?.name,
        assignee?.email,
        customer?.name,
        lead.createdAt,
      ];
    }),
  );

  await audit({
    companyId: user.companyId,
    actorId: user.userId,
    action: 'lead.exported',
    targetType: 'Lead',
    metadata: { count: leads.length },
  });

  return { csv, count: leads.length };
}

export async function exportCustomers(user: AuthUser): Promise<{ csv: string; count: number }> {
  const scope = await scopeFor(user, ['ownerId', 'sharedWithIds']);
  const customers = await Customer.find(withScope({ companyId: user.companyId }, scope))
    .populate({ path: 'ownerId', select: 'name email' })
    .sort({ createdAt: -1 })
    .limit(MAX_EXPORT_ROWS)
    .lean();

  const csv = toCsv(
    ['name', 'email', 'phone', 'gstin', 'address', 'notes', 'owner', 'ownerEmail', 'createdAt'],
    customers.map(customer => {
      const owner = customer.ownerId as unknown as PopulatedName | null;
      return [
        customer.name,
        customer.email,
        customer.phone,
        customer.gstin,
        customer.address,
        customer.notes,
        owner?.name,
        owner?.email,
        customer.createdAt,
      ];
    }),
  );

  await audit({
    companyId: user.companyId,
    actorId: user.userId,
    action: 'customer.exported',
    targetType: 'Customer',
    metadata: { count: customers.length },
  });

  return { csv, count: customers.length };
}
