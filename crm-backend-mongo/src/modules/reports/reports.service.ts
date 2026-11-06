import { Types } from 'mongoose';
import { Invoice, Lead, Opportunity, Customer } from '@/models';

// Optional visibility filters from utils/scope.ts. Empty = whole company
// (OWNER / ADMIN / managers without a team); otherwise a team manager's
// reports only cover their members' records.
type Scope = Record<string, unknown>;

/** Monthly revenue for the last N months, computed from actually-paid invoices. */
export async function getSalesReport(companyId: string, months = 6, invoiceScope: Scope = {}) {
  const companyObjectId = new Types.ObjectId(companyId);
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const rows = await Invoice.aggregate([
    { $match: { companyId: companyObjectId, status: 'PAID', updatedAt: { $gte: start }, ...invoiceScope } },
    {
      $group: {
        _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
        revenue: { $sum: '$total' },
        invoiceCount: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return rows.map(r => ({
    year: r._id.year,
    month: r._id.month,
    revenue: r.revenue,
    invoiceCount: r.invoiceCount,
  }));
}

/** Lead conversion rate broken down by source — real counts, not estimates. */
export async function getLeadConversionReport(companyId: string, leadScope: Scope = {}) {
  const companyObjectId = new Types.ObjectId(companyId);
  const rows = await Lead.aggregate([
    { $match: { companyId: companyObjectId, ...leadScope } },
    {
      $group: {
        _id: '$source',
        total: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$status', 'LOST'] }, 1, 0] } },
      },
    },
  ]);

  return rows.map(r => ({
    source: r._id,
    total: r.total,
    converted: r.converted,
    lost: r.lost,
    conversionRate: r.total > 0 ? Math.round((r.converted / r.total) * 1000) / 10 : 0,
  }));
}

/** Deal/opportunity performance — win rate and average deal size from real closed deals. */
export async function getDealsReport(companyId: string, dealScope: Scope = {}) {
  const companyObjectId = new Types.ObjectId(companyId);
  const [byStage, closedAgg] = await Promise.all([
    Opportunity.aggregate([
      { $match: { companyId: companyObjectId, ...dealScope } },
      { $group: { _id: '$stage', count: { $sum: 1 }, totalValue: { $sum: '$amount' } } },
    ]),
    Opportunity.aggregate([
      { $match: { companyId: companyObjectId, stage: { $in: ['WON', 'LOST'] }, ...dealScope } },
      {
        $group: {
          _id: null,
          won: { $sum: { $cond: [{ $eq: ['$stage', 'WON'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$stage', 'LOST'] }, 1, 0] } },
          wonValue: { $sum: { $cond: [{ $eq: ['$stage', 'WON'] }, '$amount', 0] } },
        },
      },
    ]),
  ]);

  const closed = closedAgg[0] ?? { won: 0, lost: 0, wonValue: 0 };
  const totalClosed = closed.won + closed.lost;

  return {
    byStage: byStage.map(s => ({ stage: s._id, count: s.count, totalValue: s.totalValue })),
    winRate: totalClosed > 0 ? Math.round((closed.won / totalClosed) * 1000) / 10 : 0,
    averageWonDealSize: closed.won > 0 ? Math.round((closed.wonValue / closed.won) * 100) / 100 : 0,
    totalWon: closed.won,
    totalLost: closed.lost,
  };
}

/** Top customers by actual paid revenue, not by record count. */
export async function getTopCustomersReport(companyId: string, limit = 10, invoiceScope: Scope = {}) {
  const companyObjectId = new Types.ObjectId(companyId);
  const rows = await Invoice.aggregate([
    { $match: { companyId: companyObjectId, status: 'PAID', ...invoiceScope } },
    { $group: { _id: '$customerId', revenue: { $sum: '$total' }, invoiceCount: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);

  const customerIds = rows.map(r => r._id);
  const customers = await Customer.find({ _id: { $in: customerIds }, companyId }).select('name');
  const nameById = new Map(customers.map(c => [c._id.toString(), c.name]));

  return rows.map(r => ({
    customerId: r._id.toString(),
    customerName: nameById.get(r._id.toString()) ?? 'Unknown',
    revenue: r.revenue,
    invoiceCount: r.invoiceCount,
  }));
}
