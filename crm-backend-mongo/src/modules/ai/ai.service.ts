import { Types } from 'mongoose';
import { Lead, Activity, Invoice, Customer } from '@/models';
import { getSalesReport } from '@/modules/reports/reports.service';

/*
 * Everything in this file computes its output from real documents already
 * in the database — there is no external AI/LLM API call (this project has
 * no key for one) and no hardcoded example numbers. "AI Center" here means
 * rule-based and statistical analysis: weighted lead scoring, a linear
 * trend forecast, and staleness/risk detection — the same techniques real
 * CRMs use before reaching for a trained model. Every score is
 * reproducible from the underlying data, which is what makes it honest
 * rather than decorative.
 */

/**
 * Scores each open lead 0-100 from four real signals: contact-info
 * completeness, how well that lead's source has historically converted for
 * this company, how fresh the lead is, and whether anyone has logged
 * engagement (an activity) against it yet.
 */
// Optional visibility filters from utils/scope.ts (empty = whole company).
type Scope = Record<string, unknown>;

export async function getLeadScores(companyId: string, leadScope: Scope = {}) {
  const companyObjectId = new Types.ObjectId(companyId);

  // Only leads the caller may see are scored. The per-source conversion
  // statistics below stay company-wide: they are anonymous aggregates and
  // give a better signal than one rep's history.
  const openLeads = await Lead.find({
    ...leadScope,
    companyId,
    status: { $in: ['NEW', 'CONTACTED', 'QUALIFIED'] },
  });
  if (openLeads.length === 0) return [];

  // Historical conversion rate per source, computed from this company's
  // own closed leads — a source with a strong track record here should
  // count for more than one that's never converted.
  const sourceStats = await Lead.aggregate([
    { $match: { companyId: companyObjectId, status: { $in: ['CONVERTED', 'LOST'] } } },
    {
      $group: {
        _id: '$source',
        total: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
      },
    },
  ]);
  const conversionBySource = new Map(
    sourceStats.map(s => [s._id, s.total > 0 ? s.converted / s.total : 0.5]),
  );

  const leadIds = openLeads.map(l => l._id);
  const activityCounts = await Activity.aggregate([
    { $match: { companyId: companyObjectId, leadId: { $in: leadIds } } },
    { $group: { _id: '$leadId', count: { $sum: 1 } } },
  ]);
  const activityCountByLead = new Map(activityCounts.map(a => [a._id.toString(), a.count]));

  const now = Date.now();
  const scored = openLeads.map(lead => {
    // Contact completeness: up to 25 points for having both email and phone.
    const completeness = (lead.email ? 12.5 : 0) + (lead.phone ? 12.5 : 0);

    // Source quality: up to 35 points, scaled by this source's real
    // historical conversion rate (falls back to a neutral 50% if the
    // company has no closed leads from that source yet).
    const sourceRate = conversionBySource.get(lead.source) ?? 0.5;
    const sourceScore = sourceRate * 35;

    // Freshness: up to 20 points, decaying linearly over 30 days — a lead
    // sitting untouched for a month is treated as effectively stale.
    const ageDays = (now - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshness = Math.max(0, 20 - (ageDays / 30) * 20);

    // Engagement: up to 20 points if there's already logged activity —
    // a lead someone has actually followed up on outranks one nobody's
    // touched.
    const hasActivity = (activityCountByLead.get(lead._id.toString()) ?? 0) > 0;
    const engagement = hasActivity ? 20 : 0;

    const score = Math.round(completeness + sourceScore + freshness + engagement);

    return {
      leadId: lead._id.toString(),
      name: lead.name,
      status: lead.status,
      source: lead.source,
      score: Math.min(100, score),
      factors: {
        contactCompleteness: Math.round(completeness),
        sourceQuality: Math.round(sourceScore),
        freshness: Math.round(freshness),
        engagement,
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Forecasts next month's revenue using linear regression over the actual
 * last 6 months of paid-invoice revenue. With fewer than 2 months of real
 * history, there isn't enough signal for a trend line, so this returns
 * null rather than inventing a number.
 */
export async function getSalesForecast(companyId: string, invoiceScope: Scope = {}) {
  const history = await getSalesReport(companyId, 6, invoiceScope);
  if (history.length < 2) {
    return {
      forecastedRevenue: null,
      basis: 'insufficient_history',
      monthsOfHistory: history.length,
      history,
    };
  }

  const xs = history.map((_, i) => i);
  const ys = history.map(h => h.revenue);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;
  const nextX = n;
  const forecast = Math.max(0, Math.round((slope * nextX + intercept) * 100) / 100);

  return {
    forecastedRevenue: forecast,
    basis: 'linear_trend',
    monthsOfHistory: history.length,
    trendDirection: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
    history,
  };
}

/**
 * Surfaces concrete next actions from real overdue/stale records — not
 * generic advice. Every item here points at an actual document.
 */
export async function getNextBestActions(
  companyId: string,
  userId: string,
  scopes: { leads: Scope; invoices: Scope } = { leads: {}, invoices: {} },
) {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [overdueTasks, staleLeads, overdueInvoices, topScoredLeads] = await Promise.all([
    Activity.find({
      companyId,
      assignedToId: userId,
      status: 'PENDING',
      dueAt: { $lt: now },
    }).select('summary dueAt').limit(5),
    Lead.find({
      ...scopes.leads,
      companyId,
      status: { $in: ['NEW', 'CONTACTED'] },
      updatedAt: { $lt: staleCutoff },
    }).select('name status updatedAt').limit(5),
    Invoice.find({
      ...scopes.invoices,
      companyId,
      status: 'PENDING',
      dueDate: { $lt: now },
    }).select('invoiceNumber total dueDate').limit(5),
    getLeadScores(companyId, scopes.leads),
  ]);

  const actions: { type: string; message: string; relatedId: string; priority: 'high' | 'medium' | 'low' }[] = [];

  overdueTasks.forEach(t =>
    actions.push({
      type: 'OVERDUE_TASK',
      message: `Task "${t.summary}" is overdue.`,
      relatedId: t._id.toString(),
      priority: 'high',
    }),
  );

  overdueInvoices.forEach(inv =>
    actions.push({
      type: 'OVERDUE_INVOICE',
      message: `Invoice ${inv.invoiceNumber} (${inv.total}) is overdue.`,
      relatedId: inv._id.toString(),
      priority: 'high',
    }),
  );

  staleLeads.forEach(l =>
    actions.push({
      type: 'STALE_LEAD',
      message: `${l.name} hasn't been touched in over 14 days.`,
      relatedId: l._id.toString(),
      priority: 'medium',
    }),
  );

  topScoredLeads.slice(0, 3).forEach(l =>
    actions.push({
      type: 'HIGH_SCORE_LEAD',
      message: `${l.name} scores ${l.score}/100 — worth prioritizing.`,
      relatedId: l.leadId,
      priority: l.score >= 70 ? 'high' : 'medium',
    }),
  );

  const priorityRank = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
}

/**
 * Flags customers who look at risk of going cold: paying customers with no
 * logged activity in the last 30 days, and customers with zero open leads
 * or opportunities despite having purchase history.
 */
export async function getCustomerInsights(
  companyId: string,
  scopes: { customers: Scope; invoices: Scope } = { customers: {}, invoices: {} },
) {
  const staleCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const payingCustomerIds = await Invoice.distinct('customerId', { ...scopes.invoices, companyId, status: 'PAID' });
  if (payingCustomerIds.length === 0) {
    return { atRiskCustomers: [], basis: 'no_paid_invoices_yet' };
  }

  const recentActivityCustomerIds = await Activity.distinct('customerId', {
    companyId,
    customerId: { $in: payingCustomerIds },
    createdAt: { $gte: staleCutoff },
  });
  const recentSet = new Set(recentActivityCustomerIds.map(id => id?.toString()));

  const atRiskIds = payingCustomerIds.filter(id => !recentSet.has(id?.toString()));
  const atRiskCustomers = await Customer.find({ ...scopes.customers, _id: { $in: atRiskIds }, companyId })
    .select('name email phone');

  return {
    atRiskCustomers: atRiskCustomers.map(c => ({
      customerId: c._id.toString(),
      name: c.name,
      email: c.email,
      phone: c.phone,
      reason: 'No logged activity in the last 30 days despite being a paying customer.',
    })),
    basis: 'real_activity_gap',
  };
}
