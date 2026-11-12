import { Types } from 'mongoose';

import type { AuthUser } from '@/middlewares/auth.middleware';
import { Activity, Invoice, Lead, Opportunity, Payment } from '@/models';
import { activityScope, invoiceScope, scopeFor } from '@/utils/scope';

/* ============================================================
   Deal risk + daily briefing (v1.4). Rule-based, reproducible from
   the data (see the note in ai.service.ts), hierarchy-scoped, open
   to every role.
============================================================ */

const DAY = 86_400_000;

const STAGE_BASE: Record<string, number> = {
  PROSPECTING: 15,
  QUALIFICATION: 30,
  PROPOSAL: 50,
  NEGOTIATION: 70,
};

const NEXT_STEP: Record<string, string> = {
  PROSPECTING: 'Book a discovery call and confirm the decision-maker.',
  QUALIFICATION: 'Confirm budget, need and timeline, then send a proposal.',
  PROPOSAL: 'Follow up on the proposal and handle objections.',
  NEGOTIATION: 'Agree final terms and ask for the purchase order.',
};

export interface DealInsight {
  id: string;
  title: string;
  stage: string;
  amount: number;
  owner: string | null;
  customer: string | null;
  closeDate: Date | null;
  probability: number;
  risk: 'low' | 'medium' | 'high';
  weighted: number;
  signals: { label: string; impact: number }[];
  nextStep: string;
}

export async function dealInsights(user: AuthUser): Promise<{ deals: DealInsight[]; summary: Record<string, number> }> {
  const companyId = new Types.ObjectId(user.companyId);
  const now = Date.now();
  const deals = await Opportunity.find({ ...(await scopeFor(user, 'ownerId')), companyId, stage: { $nin: ['WON', 'LOST'] } })
    .populate({ path: 'ownerId', select: 'name' })
    .populate({ path: 'customerId', select: 'name' })
    .lean();

  const dealIds = deals.map(d => d._id);
  const customerIds = deals.map(d => (d.customerId as unknown as { _id?: Types.ObjectId } | null)?._id).filter(Boolean) as Types.ObjectId[];

  const [activityRows, overdueRows, wonRows] = await Promise.all([
    Activity.aggregate([
      { $match: { companyId, opportunityId: { $in: dealIds } } },
      { $group: { _id: '$opportunityId', last: { $max: '$createdAt' }, open: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } } } },
    ]),
    Invoice.aggregate([
      { $match: { companyId, customerId: { $in: customerIds }, status: { $in: ['PENDING', 'OVERDUE'] }, dueDate: { $lt: new Date(now) } } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]),
    Opportunity.aggregate([
      { $match: { companyId, customerId: { $in: customerIds }, stage: 'WON' } },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]),
  ]);
  const act = new Map(activityRows.map(r => [String(r._id), r]));
  const overdue = new Map(overdueRows.map(r => [String(r._id), r.count as number]));
  const won = new Map(wonRows.map(r => [String(r._id), r.count as number]));

  const insights: DealInsight[] = deals.map(d => {
    const signals: { label: string; impact: number }[] = [];
    let p = STAGE_BASE[d.stage] ?? 20;
    signals.push({ label: `${d.stage.charAt(0)}${d.stage.slice(1).toLowerCase()} stage`, impact: p });

    const customer = d.customerId as unknown as { _id: Types.ObjectId; name: string } | null;
    const cid = customer ? String(customer._id) : null;
    if (cid && (won.get(cid) ?? 0) > 0) {
      p += 10;
      signals.push({ label: 'Repeat customer (won before)', impact: 10 });
    }
    if (cid && (overdue.get(cid) ?? 0) > 0) {
      p -= 10;
      signals.push({ label: 'Customer has overdue invoices', impact: -10 });
    }
    const a = act.get(String(d._id));
    const lastTouch = Math.max(new Date(d.updatedAt).getTime(), a?.last ? new Date(a.last).getTime() : 0);
    const idleDays = Math.floor((now - lastTouch) / DAY);
    if (idleDays > 21) {
      p -= 15;
      signals.push({ label: `No activity for ${idleDays} days`, impact: -15 });
    } else if (idleDays <= 7) {
      p += 5;
      signals.push({ label: 'Worked on this week', impact: 5 });
    }
    if (d.closeDate) {
      const toClose = Math.floor((new Date(d.closeDate).getTime() - now) / DAY);
      if (toClose < 0) {
        p -= 15;
        signals.push({ label: `Close date passed ${-toClose} day(s) ago`, impact: -15 });
      } else if (toClose <= 14 && d.stage === 'NEGOTIATION') {
        p += 5;
        signals.push({ label: 'Closing within two weeks', impact: 5 });
      }
    } else {
      p -= 5;
      signals.push({ label: 'No expected close date', impact: -5 });
    }
    if (!d.ownerId) {
      p -= 5;
      signals.push({ label: 'Nobody owns this deal', impact: -5 });
    }
    const probability = Math.max(5, Math.min(95, Math.round(p)));
    const risk = probability >= 55 ? 'low' : probability >= 30 ? 'medium' : 'high';
    const owner = d.ownerId as unknown as { name: string } | null;

    let nextStep = NEXT_STEP[d.stage] ?? 'Review this deal.';
    if (d.closeDate && new Date(d.closeDate).getTime() < now) nextStep = 'Update the close date or mark the deal won/lost so the forecast stays right.';
    else if (idleDays > 21) nextStep = 'Re-engage the customer — call or visit this week.';
    else if (cid && (overdue.get(cid) ?? 0) > 0) nextStep = 'Clear the overdue invoice before extending more credit.';

    return {
      id: String(d._id),
      title: d.title,
      stage: d.stage,
      amount: d.amount,
      owner: owner?.name ?? null,
      customer: customer?.name ?? null,
      closeDate: d.closeDate ?? null,
      probability,
      risk,
      weighted: Math.round((d.amount * probability) / 100),
      signals,
      nextStep,
    };
  });

  insights.sort((x, y) => y.weighted - x.weighted);
  return {
    deals: insights,
    summary: {
      open: insights.length,
      pipeline: insights.reduce((s, d) => s + d.amount, 0),
      weighted: insights.reduce((s, d) => s + d.weighted, 0),
      highRisk: insights.filter(d => d.risk === 'high').length,
    },
  };
}

/** Plain-language summary of the user's scope for today. */
export async function briefing(user: AuthUser): Promise<{ headline: string; points: { icon: string; text: string; tone: 'good' | 'warn' | 'bad' | 'info' }[] }> {
  const companyId = new Types.ObjectId(user.companyId);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const [dealScope, leadScope, actScope, invScope] = await Promise.all([
    scopeFor(user, 'ownerId'),
    scopeFor(user, 'assignedToId'),
    activityScope(user),
    invoiceScope(user),
  ]);

  const [wonWeek, newLeads, coldLeads, overdueTasks, dueToday, overdueInvoices, deals] = await Promise.all([
    Opportunity.find({ ...dealScope, companyId, stage: 'WON', updatedAt: { $gte: weekAgo } }).select('amount').lean(),
    Lead.countDocuments({ ...leadScope, companyId, createdAt: { $gte: weekAgo } }),
    Lead.countDocuments({ ...leadScope, companyId, status: { $in: ['NEW', 'CONTACTED'] }, updatedAt: { $lt: weekAgo } }),
    Activity.countDocuments({ ...actScope, companyId, status: 'PENDING', dueAt: { $ne: null, $lt: new Date(now.toDateString()) } }),
    Activity.countDocuments({ ...actScope, companyId, status: 'PENDING', dueAt: { $gte: new Date(now.toDateString()), $lt: new Date(new Date(now.toDateString()).getTime() + DAY) } }),
    Invoice.find({ $and: [{ companyId, status: { $in: ['PENDING', 'OVERDUE'] }, dueDate: { $lt: now } }, invScope] }).select('total').lean(),
    dealInsights(user),
  ]);

  const paidOnOverdue = overdueInvoices.length
    ? await Payment.aggregate([
        { $match: { companyId, invoiceId: { $in: overdueInvoices.map(i => i._id) } } },
        { $group: { _id: null, paid: { $sum: '$amount' } } },
      ])
    : [];
  const overdueAmount = Math.max(0, overdueInvoices.reduce((s, i) => s + i.total, 0) - (paidOnOverdue[0]?.paid ?? 0));
  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const wonValue = wonWeek.reduce((s, d) => s + d.amount, 0);
  const top = deals.deals[0];

  const points: { icon: string; text: string; tone: 'good' | 'warn' | 'bad' | 'info' }[] = [];
  if (wonValue > 0) points.push({ icon: 'trophy-outline', text: `${wonWeek.length} deal(s) won this week worth ${inr(wonValue)}.`, tone: 'good' });
  points.push({ icon: 'trending-up-outline', text: `Open pipeline ${inr(deals.summary.pipeline)} across ${deals.summary.open} deal(s); realistic forecast ${inr(deals.summary.weighted)}.`, tone: 'info' });
  if (top) points.push({ icon: 'star-outline', text: `Biggest opportunity: “${top.title}” — ${top.probability}% likely. ${top.nextStep}`, tone: 'info' });
  if (deals.summary.highRisk > 0) points.push({ icon: 'warning-outline', text: `${deals.summary.highRisk} deal(s) at high risk of slipping.`, tone: 'bad' });
  if (overdueAmount > 0) points.push({ icon: 'receipt-outline', text: `${inr(overdueAmount)} overdue across ${overdueInvoices.length} invoice(s) — chase payments today.`, tone: 'bad' });
  if (overdueTasks > 0) points.push({ icon: 'alarm-outline', text: `${overdueTasks} overdue task(s) need finishing or rescheduling.`, tone: 'warn' });
  if (dueToday > 0) points.push({ icon: 'today-outline', text: `${dueToday} task(s) due today.`, tone: 'info' });
  if (coldLeads > 0) points.push({ icon: 'snow-outline', text: `${coldLeads} lead(s) untouched for a week — contact them before they go cold.`, tone: 'warn' });
  if (newLeads > 0) points.push({ icon: 'person-add-outline', text: `${newLeads} new lead(s) this week.`, tone: 'good' });

  const problems = points.filter(p => p.tone === 'bad').length;
  const headline = problems
    ? `${problems} thing(s) need your attention today.`
    : wonValue > 0
      ? 'Good week — keep the momentum going.'
      : 'All clear. Focus on moving your top deals forward.';
  return { headline, points };
}
