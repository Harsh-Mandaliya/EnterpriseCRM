import { Invoice } from '@/models';
import { ApiError } from '@/utils/apiError';
import { assertSameCompanyRefs, withScope } from '@/utils/scope';

// Visibility filter from utils/scope.ts invoiceScope().
type Scope = Record<string, unknown>;

const POPULATE_CUSTOMER = { path: 'customerId', select: 'name email phone address gstin' };

export function computeTotals(lineItems: { quantity: number; unitPrice: number }[], taxRate = 0) {
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, tax, total };
}

// PENDING invoices past their due date read as OVERDUE without needing a
// cron job — the stored status only changes when someone explicitly marks
// an invoice paid/cancelled via updateInvoiceStatus.
function withDerivedStatus(doc: any) {
  const json = doc.toJSON();
  // The app reads `customer` (details) and `customerId` (id string);
  // populate() puts the details on customerId, so split them.
  if (json.customerId && typeof json.customerId === 'object') {
    json.customer = json.customerId;
    json.customerId = json.customerId.id;
  } else {
    json.customer = null;
  }
  if (json.status === 'PENDING' && new Date(json.dueDate) < new Date()) {
    json.status = 'OVERDUE';
  }
  return json;
}

// Based on the highest existing number rather than a document count, so
// deleting an invoice can never make the next number collide.
async function nextInvoiceNumber(companyId: string): Promise<string> {
  const latest = await Invoice.findOne({ companyId, invoiceNumber: /^INV-\d+$/ })
    .sort({ createdAt: -1, invoiceNumber: -1 })
    .select('invoiceNumber')
    .lean();
  const last = latest ? Number(latest.invoiceNumber.slice(4)) : 0;
  return `INV-${String(last + 1).padStart(4, '0')}`;
}

export async function listInvoices(
  companyId: string,
  params: { status?: string; customerId?: string },
  scope: Scope = {},
) {
  const filter: Record<string, unknown> = { companyId };
  if (params.customerId) filter.customerId = params.customerId;
  const invoices = await Invoice.find(withScope(filter, scope)).populate(POPULATE_CUSTOMER).sort({ createdAt: -1 });
  let results = invoices.map(withDerivedStatus);
  // Filtering by status happens after derivation so a "status=OVERDUE"
  // query correctly includes PENDING invoices that are now past due.
  if (params.status) {
    results = results.filter(inv => inv.status === params.status);
  }
  return results;
}

export async function getInvoice(companyId: string, id: string, scope: Scope = {}) {
  const invoice = await Invoice.findOne(withScope({ _id: id, companyId }, scope)).populate(POPULATE_CUSTOMER);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return withDerivedStatus(invoice);
}

export async function createInvoice(
  companyId: string,
  createdById: string,
  input: {
    customerId: string;
    lineItems: { productId?: string; description: string; quantity: number; unitPrice: number }[];
    taxRate?: number;
    dueDate: string;
    notes?: string;
  },
) {
  await assertSameCompanyRefs(companyId, { customerId: input.customerId });
  const totals = computeTotals(input.lineItems, input.taxRate ?? 0);
  const invoiceNumber = await nextInvoiceNumber(companyId);
  const invoice = await Invoice.create({
    companyId,
    createdById,
    invoiceNumber,
    customerId: input.customerId,
    lineItems: input.lineItems,
    dueDate: new Date(input.dueDate),
    notes: input.notes,
    status: 'PENDING',
    ...totals,
  });
  await invoice.populate(POPULATE_CUSTOMER);
  return withDerivedStatus(invoice);
}

export async function updateInvoice(
  companyId: string,
  id: string,
  input: Partial<{
    customerId: string;
    lineItems: { productId?: string; description: string; quantity: number; unitPrice: number }[];
    taxRate: number;
    dueDate: string;
    notes: string;
  }>,
  scope: Scope = {},
) {
  await assertSameCompanyRefs(companyId, { customerId: input.customerId });
  const existing = await Invoice.findOne(withScope({ _id: id, companyId }, scope));
  if (!existing) throw ApiError.notFound('Invoice not found');
  if (existing.status === 'PAID') {
    throw ApiError.badRequest('A paid invoice cannot be edited');
  }

  if (input.lineItems) existing.lineItems = input.lineItems as any;
  if (input.customerId) existing.customerId = input.customerId as any;
  if (input.dueDate) existing.dueDate = new Date(input.dueDate);
  if (input.notes !== undefined) existing.notes = input.notes;

  if (input.lineItems || input.taxRate !== undefined) {
    const totals = computeTotals(existing.lineItems, input.taxRate ?? 0);
    existing.subtotal = totals.subtotal;
    existing.tax = totals.tax;
    existing.total = totals.total;
  }

  await existing.save();
  await existing.populate(POPULATE_CUSTOMER);
  return withDerivedStatus(existing);
}

export async function updateInvoiceStatus(companyId: string, id: string, status: string, scope: Scope = {}) {
  const existing = await Invoice.findOne(withScope({ _id: id, companyId }, scope));
  if (!existing) throw ApiError.notFound('Invoice not found');
  existing.status = status as any;
  await existing.save();
  await existing.populate(POPULATE_CUSTOMER);
  return withDerivedStatus(existing);
}

export async function deleteInvoice(companyId: string, id: string, scope: Scope = {}) {
  const existing = await Invoice.findOneAndDelete(withScope({ _id: id, companyId }, scope));
  if (!existing) throw ApiError.notFound('Invoice not found');
}
