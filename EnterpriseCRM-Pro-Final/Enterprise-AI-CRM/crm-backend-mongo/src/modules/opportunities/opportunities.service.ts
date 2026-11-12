import { Opportunity } from '@/models';
import { ApiError } from '@/utils/apiError';
import { assertSameCompanyRefs } from '@/utils/scope';

// Ownership filter from utils/scope.ts ({} or { ownerId: <me> }).
type Scope = Record<string, unknown>;

const POPULATE_CUSTOMER = { path: 'customerId', select: 'name' };
const POPULATE_OWNER = { path: 'ownerId', select: 'name' };

function toOpportunityJson(doc: any) {
  const json = doc.toJSON();
  const customer = doc.customerId && doc.customerId.name
    ? { id: doc.customerId._id.toString(), name: doc.customerId.name }
    : null;
  const owner = doc.ownerId && doc.ownerId.name
    ? { id: doc.ownerId._id.toString(), name: doc.ownerId.name }
    : null;
  return {
    ...json,
    customerId: customer?.id ?? json.customerId ?? null,
    ownerId: owner?.id ?? json.ownerId ?? null,
    customer,
    owner,
    amount: Number(json.amount),
  };
}

export async function listOpportunities(companyId: string, scope: Scope = {}) {
  const opportunities = await Opportunity.find({ ...scope, companyId })
    .populate(POPULATE_CUSTOMER)
    .populate(POPULATE_OWNER)
    .sort({ createdAt: -1 });
  return opportunities.map(toOpportunityJson);
}

export async function getOpportunity(companyId: string, id: string, scope: Scope = {}) {
  const opp = await Opportunity.findOne({ ...scope, _id: id, companyId })
    .populate(POPULATE_CUSTOMER)
    .populate(POPULATE_OWNER)
    .populate({ path: 'leadId', select: 'name' });
  if (!opp) throw ApiError.notFound('Opportunity not found');
  return toOpportunityJson(opp);
}

export async function createOpportunity(
  companyId: string,
  input: Record<string, unknown>,
) {
  await assertSameCompanyRefs(companyId, {
    customerId: input.customerId,
    leadId: input.leadId,
    userIds: [input.ownerId],
  });
  const opp = await Opportunity.create({ ...input, companyId });
  await opp.populate([POPULATE_CUSTOMER, POPULATE_OWNER]);
  return toOpportunityJson(opp);
}

export async function updateOpportunity(
  companyId: string,
  id: string,
  input: Record<string, unknown>,
  scope: Scope = {},
) {
  await assertSameCompanyRefs(companyId, {
    customerId: input.customerId,
    leadId: input.leadId,
    userIds: [input.ownerId],
  });
  const existing = await Opportunity.findOne({ ...scope, _id: id, companyId });
  if (!existing) throw ApiError.notFound('Opportunity not found');
  Object.assign(existing, input);
  await existing.save();
  await existing.populate([POPULATE_CUSTOMER, POPULATE_OWNER]);
  return toOpportunityJson(existing);
}

export async function deleteOpportunity(companyId: string, id: string, scope: Scope = {}) {
  const existing = await Opportunity.findOneAndDelete({ ...scope, _id: id, companyId });
  if (!existing) throw ApiError.notFound('Opportunity not found');
}
