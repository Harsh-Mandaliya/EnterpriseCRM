import { Payment, Invoice } from '@/models';
import { ApiError } from '@/utils/apiError';
import { withScope } from '@/utils/scope';

// Visibility filters from utils/scope.ts (invoiceScope / paymentScope).
type Scope = Record<string, unknown>;
import { notify } from '@/modules/notifications/notifications.service';

const POPULATE = [
  { path: 'invoiceId', select: 'invoiceNumber total status' },
  { path: 'customerId', select: 'name' },
];

export async function listPayments(companyId: string, params: { invoiceId?: string }, scope: Scope = {}) {
  const filter: Record<string, unknown> = { companyId };
  if (params.invoiceId) filter.invoiceId = params.invoiceId;
  const payments = await Payment.find(withScope(filter, scope)).populate(POPULATE).sort({ paidAt: -1 });
  return payments.map(p => p.toJSON());
}

export async function createPayment(
  companyId: string,
  recordedById: string,
  input: { invoiceId: string; amount: number; method?: string; reference?: string; paidAt?: string },
  invoiceVisibility: Scope = {},
) {
  const invoice = await Invoice.findOne(withScope({ _id: input.invoiceId, companyId }, invoiceVisibility));
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot record a payment against a cancelled invoice');
  }

  const payment = await Payment.create({
    companyId,
    invoiceId: input.invoiceId,
    customerId: invoice.customerId,
    amount: input.amount,
    method: input.method ?? 'BANK_TRANSFER',
    reference: input.reference,
    paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
    status: 'COMPLETED',
    recordedById,
  });

  // A payment isn't just a record sitting next to the invoice — it actually
  // moves the invoice's real status. Once total completed payments meet or
  // exceed the invoice total, the invoice becomes PAID automatically.
  const paidAgg = await Payment.aggregate([
    { $match: { invoiceId: invoice._id, status: 'COMPLETED' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalPaid = paidAgg[0]?.total ?? 0;
  if (totalPaid >= invoice.total && invoice.status !== 'PAID') {
    invoice.status = 'PAID';
    await invoice.save();
  }

  // Notify whoever created the invoice that money actually came in — the
  // one place in this module a human genuinely needs to know something
  // happened without checking the invoice list themselves.
  if (invoice.createdById) {
    await notify(companyId, invoice.createdById.toString(), {
      type: 'PAYMENT',
      title: 'Payment received',
      message: `A payment of ${input.amount} was recorded against invoice ${invoice.invoiceNumber}.`,
      relatedId: invoice._id.toString(),
    });
  }

  await payment.populate(POPULATE);
  return { payment: payment.toJSON(), invoiceTotalPaid: totalPaid, invoiceStatus: invoice.status };
}

export async function getInvoicePaymentSummary(companyId: string, invoiceId: string, invoiceVisibility: Scope = {}) {
  const invoice = await Invoice.findOne(withScope({ _id: invoiceId, companyId }, invoiceVisibility));
  if (!invoice) throw ApiError.notFound('Invoice not found');
  const paidAgg = await Payment.aggregate([
    { $match: { invoiceId: invoice._id, status: 'COMPLETED' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalPaid = paidAgg[0]?.total ?? 0;
  return {
    invoiceTotal: invoice.total,
    totalPaid,
    balanceDue: Math.max(0, invoice.total - totalPaid),
    status: invoice.status,
  };
}
