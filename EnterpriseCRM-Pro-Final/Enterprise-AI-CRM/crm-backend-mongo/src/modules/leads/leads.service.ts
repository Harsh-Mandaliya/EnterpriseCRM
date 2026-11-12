import { Types } from 'mongoose';
import { Activity, Customer, Lead, Opportunity } from '@/models';
import type { AuthUser } from '@/middlewares/auth.middleware';
import { audit } from '@/utils/audit';
import { ApiError } from '@/utils/apiError';
import { assertSameCompanyRefs, withScope } from '@/utils/scope';

// `scope` is the ownership filter from utils/scope.ts: {} for
// company-wide roles, { assignedToId: <me> } for SALES/EMPLOYEE.
type Scope = Record<string, unknown>;
import { notify } from '@/modules/notifications/notifications.service';

const POPULATE_ASSIGNED = { path: 'assignedToId', select: 'name' };
const POPULATE_CUSTOMER = { path: 'customerId', select: 'name' };

// Reshapes a populated Mongoose lead into the same { assignedTo, customer }
// keys the frontend already expects from the old Prisma `include` response,
// instead of the raw populated `assignedToId`/`customerId` fields.
function toLeadJson(doc: any) {
  const json = doc.toJSON();
  const assignedTo = doc.assignedToId && doc.assignedToId.name
    ? { id: doc.assignedToId._id.toString(), name: doc.assignedToId.name }
    : null;
  const customer = doc.customerId && doc.customerId.name
    ? { id: doc.customerId._id.toString(), name: doc.customerId.name }
    : null;
  return {
    ...json,
    assignedToId: assignedTo?.id ?? json.assignedToId ?? null,
    customerId: customer?.id ?? json.customerId ?? null,
    assignedTo,
    customer,
  };
}

export async function listLeads(
  companyId: string,
  params: { status?: string; assignedToId?: string },
  scope: Scope = {},
) {
  const filter: Record<string, unknown> = { companyId };
  if (params.status) filter.status = params.status;
  if (params.assignedToId) filter.assignedToId = params.assignedToId;
  const leads = await Lead.find(withScope(filter, scope))
    .populate(POPULATE_ASSIGNED)
    .populate(POPULATE_CUSTOMER)
    .sort({ createdAt: -1 });

  return leads.map(toLeadJson);
}

export async function getLead(companyId: string, id: string, scope: Scope = {}) {
  const lead = await Lead.findOne({ ...scope, _id: id, companyId })
    .populate(POPULATE_ASSIGNED)
    .populate(POPULATE_CUSTOMER);
  if (!lead) throw ApiError.notFound('Lead not found');
  return toLeadJson(lead);
}

export async function createLead(
  companyId: string,
  input: {
    name: string;
    email?: string;
    phone?: string;
    source: string;
    customerId?: string;
    assignedToId?: string;
  },
) {
  await assertSameCompanyRefs(companyId, {
    customerId: input.customerId,
    userIds: [input.assignedToId],
  });
  const lead = await Lead.create({ ...input, companyId });
  if (input.assignedToId) {
    await notify(companyId, input.assignedToId, {
      type: 'LEAD',
      title: 'New lead assigned to you',
      message: `${lead.name} was assigned to you.`,
      relatedId: lead._id.toString(),
    });
  }
  return toLeadJson(lead);
}

export async function updateLead(
  companyId: string,
  id: string,
  input: Record<string, unknown>,
  scope: Scope = {},
) {
  await assertSameCompanyRefs(companyId, {
    customerId: input.customerId,
    userIds: [input.assignedToId],
  });
  const existing = await Lead.findOne({ ...scope, _id: id, companyId });
  if (!existing) throw ApiError.notFound('Lead not found');
  const previousAssignee = existing.assignedToId?.toString();
  Object.assign(existing, input);
  await existing.save();
  await existing.populate([POPULATE_ASSIGNED, POPULATE_CUSTOMER]);
  // Only notify when the assignee actually changed to someone new — editing
  // an unrelated field shouldn't re-notify the same person every time.
  const newAssignee = existing.assignedToId?.toString();
  if (newAssignee && newAssignee !== previousAssignee) {
    await notify(companyId, newAssignee, {
      type: 'LEAD',
      title: 'Lead assigned to you',
      message: `${existing.name} was assigned to you.`,
      relatedId: existing._id.toString(),
    });
  }
  return toLeadJson(existing);
}

export async function deleteLead(companyId: string, id: string, scope: Scope = {}) {
  const existing = await Lead.findOneAndDelete({ ...scope, _id: id, companyId });
  if (!existing) throw ApiError.notFound('Lead not found');
}

/* ============================================================
   LEAD CONVERSION
   ------------------------------------------------------------
   Turns a lead into a customer (new or existing) and optionally
   a deal, marks the lead CONVERTED and records a NOTE activity.
   MongoDB transactions need a replica set, which local/dev
   servers often lack, so created records are rolled back by
   hand if a later step fails.
============================================================ */

export interface ConvertLeadInput {
  /** Attach to an existing customer instead of creating one. */
  customerId?: string;
  createDeal?: boolean;
  deal?: {
    title?: string;
    amount?: number;
    closeDate?: string;
    stage?: 'PROSPECTING' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION';
  };
}

export async function convertLead(
  user: AuthUser,
  id: string,
  input: ConvertLeadInput,
  scope: Scope = {},
) {
  const lead = await Lead.findOne({ ...scope, _id: id, companyId: user.companyId });
  if (!lead) throw ApiError.notFound('Lead not found');
  if (lead.status === 'CONVERTED') {
    throw ApiError.conflict('This lead has already been converted');
  }
  if (lead.status === 'LOST' || lead.status === 'UNQUALIFIED') {
    throw ApiError.badRequest('Reopen the lead before converting it');
  }

  const ownerId = lead.assignedToId?.toString() ?? user.userId;
  const created: { customerId?: Types.ObjectId; opportunityId?: Types.ObjectId } = {};

  try {
    /* 1. Customer */
    let customerId: Types.ObjectId;
    if (input.customerId) {
      const existing = await Customer.findOne({
        _id: input.customerId,
        companyId: user.companyId,
      }).select('_id');
      if (!existing) throw ApiError.badRequest('Customer not found in your company');
      customerId = existing._id;
    } else if (lead.customerId) {
      customerId = lead.customerId;
    } else {
      const customer = await Customer.create({
        companyId: user.companyId,
        name: lead.name,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        ownerId,
        notes: `Created from lead on ${new Date().toISOString().slice(0, 10)}.`,
      });
      customerId = customer._id;
      created.customerId = customer._id;
    }

    /* 2. Deal */
    let opportunityId: Types.ObjectId | null = null;
    if (input.createDeal !== false) {
      const opportunity = await Opportunity.create({
        companyId: user.companyId,
        title: input.deal?.title?.trim() || `${lead.name} — new deal`,
        amount: input.deal?.amount ?? 0,
        stage: input.deal?.stage ?? 'QUALIFICATION',
        closeDate: input.deal?.closeDate ? new Date(input.deal.closeDate) : undefined,
        customerId,
        leadId: lead._id,
        ownerId,
      });
      opportunityId = opportunity._id;
      created.opportunityId = opportunity._id;
    }

    /* 3. Lead */
    lead.status = 'CONVERTED';
    lead.customerId = customerId;
    lead.convertedAt = new Date();
    lead.opportunityId = opportunityId;
    await lead.save();

    /* 4. History (best effort) */
    await Activity.create({
      companyId: user.companyId,
      type: 'NOTE',
      status: 'COMPLETED',
      summary: `Lead "${lead.name}" converted${opportunityId ? ' and a deal was created' : ''}`,
      leadId: lead._id,
      customerId,
      opportunityId,
      createdById: user.userId,
      assignedToId: ownerId,
      completedAt: new Date(),
      completedById: user.userId,
    }).catch(() => undefined);

    await audit({
      companyId: user.companyId,
      actorId: user.userId,
      action: 'lead.converted',
      targetType: 'Lead',
      targetId: id,
      metadata: {
        customerId: customerId.toString(),
        opportunityId: opportunityId?.toString() ?? null,
        newCustomer: Boolean(created.customerId),
      },
    });

    return {
      lead: await getLead(user.companyId, id),
      customerId: customerId.toString(),
      opportunityId: opportunityId?.toString() ?? null,
      createdCustomer: Boolean(created.customerId),
    };
  } catch (err) {
    if (created.opportunityId) await Opportunity.deleteOne({ _id: created.opportunityId });
    if (created.customerId) await Customer.deleteOne({ _id: created.customerId });
    throw err;
  }
}
