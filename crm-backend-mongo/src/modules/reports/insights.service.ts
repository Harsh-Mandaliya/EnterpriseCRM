import { Types } from 'mongoose';

import type { AuthUser } from '@/middlewares/auth.middleware';
import {
  Activity,
  AuditLog,
  CalendarEvent,
  Customer,
  Invoice,
  Lead,
  Opportunity,
  Payment,
  User,
} from '@/models';
import { ApiError } from '@/utils/apiError';
import {
  activityScope,
  eventVisibilityScope,
  invoiceScope,
  paymentScope,
  scopeFor,
  visibleUserIds,
} from '@/utils/scope';

/* ============================================================
   Hierarchy-aware insight reports (v1.4).

   Every function receives the signed-in user and only covers the
   records that user may see: OWNER/ADMIN the whole company, a
   team manager their team (plus themself), SALES/EMPLOYEE their
   own work. They are open to every role for that reason.
============================================================ */

const DAY = 24 * 60 * 60 * 1000;
const oid = (id: string | Types.ObjectId) => new Types.ObjectId(String(id));

function clampDays(raw: unknown, fallback: number, max = 365): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

/** Users the caller may report on (active and inactive). */
async function reportableUsers(user: AuthUser) {
  const ids = await visibleUserIds(user);
  const filter: Record<string, unknown> = { companyId: user.companyId };
  if (ids !== null) filter._id = { $in: ids };
  return User.find(filter).select('name email role isActive').sort({ name: 1 }).lean();
}

/* ============================================================
   TEAM PERFORMANCE — who did what, who didn't
============================================================ */

export async function teamPerformance(user: AuthUser, query: { days?: unknown }) {
  const days = clampDays(query.days, 30);
  const since = new Date(Date.now() - days * DAY);
  const now = new Date();
  const companyId = oid(user.companyId);
  const users = await reportableUsers(user);
  const ids = users.map(u => u._id);

  const [leads, deals, tasks, invoices, payments, work] = await Promise.all([
    Lead.aggregate([
      { $match: { companyId, assignedToId: { $in: ids } } },
      {
        $group: {
          _id: '$assignedToId',
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ['$status', ['NEW', 'CONTACTED', 'QUALIFIED']] }, 1, 0] } },
          untouched: { $sum: { $cond: [{ $eq: ['$status', 'NEW'] }, 1, 0] } },
          converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $in: ['$status', ['LOST', 'UNQUALIFIED']] }, 1, 0] } },
        },
      },
    ]),
    Opportunity.aggregate([
      { $match: { companyId, ownerId: { $in: ids } } },
      {
        $group: {
          _id: '$ownerId',
          open: { $sum: { $cond: [{ $in: ['$stage', ['WON', 'LOST']] }, 0, 1] } },
          openValue: { $sum: { $cond: [{ $in: ['$stage', ['WON', 'LOST']] }, 0, '$amount'] } },
          won: { $sum: { $cond: [{ $eq: ['$stage', 'WON'] }, 1, 0] } },
          wonValue: { $sum: { $cond: [{ $eq: ['$stage', 'WON'] }, '$amount', 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$stage', 'LOST'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                { $and: [{ $not: [{ $in: ['$stage', ['WON', 'LOST']] }] }, { $lt: ['$closeDate', now] }, { $gt: ['$closeDate', null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Activity.aggregate([
      { $match: { companyId, assignedToId: { $in: ids } } },
      {
        $group: {
          _id: '$assignedToId',
          pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$status', 'PENDING'] }, { $lt: ['$dueAt', now] }, { $gt: ['$dueAt', null] }] }, 1, 0],
            },
          },
          completed: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'COMPLETED'] }, { $gte: ['$completedAt', since] }] }, 1, 0] } },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { companyId, createdById: { $in: ids }, createdAt: { $gte: since } } },
      { $group: { _id: '$createdById', count: { $sum: 1 }, total: { $sum: '$total' } } },
    ]),
    Payment.aggregate([
      { $match: { companyId, recordedById: { $in: ids }, paidAt: { $gte: since } } },
      { $group: { _id: '$recordedById', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]),
    AuditLog.aggregate([
      { $match: { companyId, actorId: { $in: ids }, action: /^work\./, createdAt: { $gte: since } } },
      { $group: { _id: '$actorId', actions: { $sum: 1 }, lastActiveAt: { $max: '$createdAt' } } },
    ]),
  ]);

  const byId = <T extends { _id: unknown }>(rows: T[]) => new Map(rows.map(r => [String(r._id), r]));
  const L = byId(leads), D = byId(deals), T = byId(tasks), I = byId(invoices), P = byId(payments), W = byId(work);

  const members = users.map(u => {
    const id = String(u._id);
    const l = L.get(id), d = D.get(id), t = T.get(id), i = I.get(id), p = P.get(id), w = W.get(id);
    const row = {
      user: { id, name: u.name, role: u.role, isActive: u.isActive !== false },
      leads: { total: l?.total ?? 0, open: l?.open ?? 0, untouched: l?.untouched ?? 0, converted: l?.converted ?? 0, lost: l?.lost ?? 0 },
      deals: { open: d?.open ?? 0, openValue: d?.openValue ?? 0, won: d?.won ?? 0, wonValue: d?.wonValue ?? 0, lost: d?.lost ?? 0, overdue: d?.overdue ?? 0 },
      tasks: { pending: t?.pending ?? 0, overdue: t?.overdue ?? 0, completed: t?.completed ?? 0 },
      invoices: { count: i?.count ?? 0, total: i?.total ?? 0 },
      collected: { count: p?.count ?? 0, total: p?.total ?? 0 },
      activity: { actions: w?.actions ?? 0, lastActiveAt: w?.lastActiveAt ?? null },
    };
    return { ...row, flags: flagsFor(row) };
  });

  const sum = (pick: (m: (typeof members)[number]) => number) => members.reduce((s, m) => s + pick(m), 0);
  return {
    days,
    since,
    totals: {
      people: members.length,
      openLeads: sum(m => m.leads.open),
      untouchedLeads: sum(m => m.leads.untouched),
      openPipeline: sum(m => m.deals.openValue),
      wonValue: sum(m => m.deals.wonValue),
      tasksCompleted: sum(m => m.tasks.completed),
      tasksOverdue: sum(m => m.tasks.overdue),
      collected: sum(m => m.collected.total),
    },
    members,
  };
}

/** Plain-language "not done" flags shown next to each person. */
function flagsFor(row: {
  leads: { untouched: number };
  deals: { overdue: number };
  tasks: { overdue: number };
  activity: { actions: number };
}): string[] {
  const flags: string[] = [];
  if (row.tasks.overdue > 0) flags.push(`${row.tasks.overdue} overdue task${row.tasks.overdue > 1 ? 's' : ''}`);
  if (row.leads.untouched > 0) flags.push(`${row.leads.untouched} lead${row.leads.untouched > 1 ? 's' : ''} never contacted`);
  if (row.deals.overdue > 0) flags.push(`${row.deals.overdue} deal${row.deals.overdue > 1 ? 's' : ''} past close date`);
  if (row.activity.actions === 0) flags.push('No recorded activity in this period');
  return flags;
}

/* ============================================================
   WORK LOG / TIMELINE
============================================================ */

const TARGET_SCOPE: Record<string, (user: AuthUser, id: string) => Promise<boolean>> = {
  Lead: async (user, id) => !!(await Lead.exists({ ...(await scopeFor(user, 'assignedToId')), _id: id, companyId: user.companyId })),
  Opportunity: async (user, id) => !!(await Opportunity.exists({ ...(await scopeFor(user, 'ownerId')), _id: id, companyId: user.companyId })),
  Customer: async (user, id) =>
    !!(await Customer.exists({ ...(await scopeFor(user, ['ownerId', 'sharedWithIds'])), _id: id, companyId: user.companyId })),
  Invoice: async (user, id) => !!(await Invoice.exists({ $and: [{ _id: id, companyId: user.companyId }, await invoiceScope(user)] })),
};

export async function workLog(
  user: AuthUser,
  query: { days?: unknown; userId?: unknown; targetType?: unknown; targetId?: unknown; limit?: unknown },
) {
  const limit = clampDays(query.limit, 100, 300);
  const filter: Record<string, unknown> = {
    companyId: oid(user.companyId),
    action: { $in: [/^work\./, 'lead.converted'] },
  };

  const targetType = typeof query.targetType === 'string' ? query.targetType : undefined;
  const targetId = typeof query.targetId === 'string' ? query.targetId : undefined;

  if (targetId) {
    // A record's full history: everyone's actions on it, if the caller may see the record.
    if (!targetType || !TARGET_SCOPE[targetType] || !Types.ObjectId.isValid(targetId)) {
      throw ApiError.badRequest('targetType must be Lead, Opportunity, Customer or Invoice');
    }
    if (!(await TARGET_SCOPE[targetType](user, targetId))) throw ApiError.notFound('Record not found');
    filter.targetId = targetId;
  } else {
    const days = clampDays(query.days, 14);
    filter.createdAt = { $gte: new Date(Date.now() - days * DAY) };
    const ids = await visibleUserIds(user);
    if (typeof query.userId === 'string' && query.userId) {
      if (!Types.ObjectId.isValid(query.userId)) throw ApiError.badRequest('Invalid userId');
      if (ids !== null && !ids.some(i => String(i) === query.userId)) throw ApiError.notFound('User not found');
      filter.actorId = oid(query.userId);
    } else if (ids !== null) {
      filter.actorId = { $in: ids };
    }
    if (targetType) filter.targetType = targetType;
  }

  const rows = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({ path: 'actorId', select: 'name role' })
    .lean();

  return rows.map(r => {
    const actor = r.actorId as unknown as { _id: Types.ObjectId; name: string; role: string } | null;
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    return {
      id: String(r._id),
      action: r.action.replace(/^work\./, ''),
      targetType: r.targetType,
      targetId: r.targetId,
      label: (meta.label as string | null) ?? null,
      details: meta,
      actor: actor ? { id: String(actor._id), name: actor.name, role: actor.role } : null,
      at: r.createdAt,
    };
  });
}

/* ============================================================
   RECEIVABLES — invoiced, collected, outstanding, who pays
============================================================ */

export async function receivables(user: AuthUser) {
  const companyId = oid(user.companyId);
  const now = Date.now();
  const [invScope, payScope] = await Promise.all([invoiceScope(user), paymentScope(user)]);

  const invoices = await Invoice.find({ $and: [{ companyId, status: { $ne: 'CANCELLED' } }, invScope] })
    .select('invoiceNumber customerId total dueDate issueDate status createdAt')
    .populate({ path: 'customerId', select: 'name' })
    .lean();
  const invoiceIds = invoices.map(i => i._id);

  const [paidRows, methodRows, monthlyRows, collectorRows] = await Promise.all([
    Payment.aggregate([
      { $match: { companyId, invoiceId: { $in: invoiceIds }, status: { $ne: 'REFUNDED' } } },
      { $group: { _id: '$invoiceId', paid: { $sum: '$amount' }, last: { $max: '$paidAt' } } },
    ]),
    Payment.aggregate([
      { $match: { companyId, ...payScope } },
      { $group: { _id: '$method', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Payment.aggregate([
      { $match: { companyId, ...payScope, paidAt: { $gte: new Date(now - 183 * DAY) } } },
      { $group: { _id: { y: { $year: '$paidAt' }, m: { $month: '$paidAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } },
    ]),
    Payment.aggregate([
      { $match: { companyId, ...payScope } },
      { $group: { _id: '$recordedById', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const paid = new Map(paidRows.map(r => [String(r._id), r]));
  const aging = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  const customers = new Map<string, { id: string; name: string; invoiced: number; paid: number; outstanding: number; overdue: number; invoices: number; lastPaymentAt: Date | null }>();
  let invoiced = 0, collected = 0, outstanding = 0, overdue = 0, overdueCount = 0;

  for (const inv of invoices) {
    const p = paid.get(String(inv._id));
    // Status PAID counts as fully paid even if not every payment was
    // recorded (someone marked it paid); the app uses the same rule.
    const paidAmount = inv.status === 'PAID' ? inv.total : Math.min(p?.paid ?? 0, inv.total);
    const balance = Math.max(0, inv.total - paidAmount);
    invoiced += inv.total;
    collected += paidAmount;
    outstanding += balance;
    const lateDays = Math.floor((now - new Date(inv.dueDate).getTime()) / DAY);
    if (balance > 0) {
      if (lateDays <= 0) aging.current += balance;
      else if (lateDays <= 30) aging.d1_30 += balance;
      else if (lateDays <= 60) aging.d31_60 += balance;
      else if (lateDays <= 90) aging.d61_90 += balance;
      else aging.d90plus += balance;
      if (lateDays > 0) {
        overdue += balance;
        overdueCount += 1;
      }
    }
    const c = inv.customerId as unknown as { _id: Types.ObjectId; name: string } | null;
    const key = c ? String(c._id) : 'none';
    const row = customers.get(key) ?? { id: key, name: c?.name ?? 'Unknown customer', invoiced: 0, paid: 0, outstanding: 0, overdue: 0, invoices: 0, lastPaymentAt: null };
    row.invoiced += inv.total;
    row.paid += paidAmount;
    row.outstanding += balance;
    if (balance > 0 && lateDays > 0) row.overdue += balance;
    row.invoices += 1;
    if (p?.last && (!row.lastPaymentAt || p.last > row.lastPaymentAt)) row.lastPaymentAt = p.last;
    customers.set(key, row);
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    totals: {
      invoiced: round(invoiced),
      collected: round(collected),
      outstanding: round(outstanding),
      overdue: round(overdue),
      overdueCount,
      invoiceCount: invoices.length,
      collectionRate: invoiced > 0 ? Math.round((collected / invoiced) * 1000) / 10 : 0,
    },
    aging: Object.fromEntries(Object.entries(aging).map(([k, v]) => [k, round(v)])),
    byCustomer: [...customers.values()].sort((a, b) => b.invoiced - a.invoiced).map(c => ({ ...c, invoiced: round(c.invoiced), paid: round(c.paid), outstanding: round(c.outstanding), overdue: round(c.overdue) })),
    byMethod: methodRows.map(r => ({ method: r._id, count: r.count, total: round(r.total) })),
    monthly: monthlyRows.map(r => ({ year: r._id.y, month: r._id.m, total: round(r.total), count: r.count })),
    collectors: collectorRows.map(r => ({ user: r.u?.[0] ? { id: String(r._id), name: r.u[0].name } : null, count: r.count, total: round(r.total) })),
  };
}

/* ============================================================
   NEEDS ATTENTION — computed alerts with the reason they matter
============================================================ */

export type AttentionItem = {
  id: string;
  kind: 'TASK_OVERDUE' | 'TASK_DUE_TODAY' | 'INVOICE_OVERDUE' | 'DEAL_OVERDUE' | 'LEAD_STALE' | 'EVENT_SOON';
  severity: 'high' | 'medium' | 'info';
  title: string;
  detail: string;
  why: string;
  relatedType: 'Activity' | 'Invoice' | 'Opportunity' | 'Lead' | 'CalendarEvent';
  relatedId: string;
  owner: string | null;
  at: Date | null;
  amount: number | null;
};

const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, '-');

export async function attention(user: AuthUser): Promise<{ items: AttentionItem[]; counts: Record<string, number> }> {
  const companyId = oid(user.companyId);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday.getTime() + DAY);
  const in48h = new Date(now.getTime() + 2 * DAY);
  const staleBefore = new Date(now.getTime() - 7 * DAY);

  const [actScope, invScope, dealScope, leadScope, evScope] = await Promise.all([
    activityScope(user),
    invoiceScope(user),
    scopeFor(user, 'ownerId'),
    scopeFor(user, 'assignedToId'),
    eventVisibilityScope(user),
  ]);

  const [tasks, invoices, deals, leads, events] = await Promise.all([
    Activity.find({ ...actScope, companyId, status: 'PENDING', dueAt: { $ne: null, $lt: endToday } })
      .populate({ path: 'assignedToId', select: 'name' }).sort({ dueAt: 1 }).limit(50).lean(),
    Invoice.find({ $and: [{ companyId, status: { $in: ['PENDING', 'OVERDUE'] }, dueDate: { $lt: now } }, invScope] })
      .populate({ path: 'customerId', select: 'name' }).sort({ dueDate: 1 }).limit(50).lean(),
    Opportunity.find({ ...dealScope, companyId, stage: { $nin: ['WON', 'LOST'] }, closeDate: { $ne: null, $lt: now } })
      .populate({ path: 'ownerId', select: 'name' }).sort({ closeDate: 1 }).limit(50).lean(),
    Lead.find({ ...leadScope, companyId, status: { $in: ['NEW', 'CONTACTED'] }, updatedAt: { $lt: staleBefore } })
      .populate({ path: 'assignedToId', select: 'name' }).sort({ updatedAt: 1 }).limit(50).lean(),
    CalendarEvent.find({ ...evScope, companyId, startAt: { $gte: now, $lt: in48h } }).sort({ startAt: 1 }).limit(20).lean(),
  ]);

  const paidRows = invoices.length
    ? await Payment.aggregate([
        { $match: { companyId, invoiceId: { $in: invoices.map(i => i._id) } } },
        { $group: { _id: '$invoiceId', paid: { $sum: '$amount' } } },
      ])
    : [];
  const paid = new Map(paidRows.map(r => [String(r._id), r.paid as number]));
  const nameOf = (v: unknown) => (v && typeof v === 'object' && 'name' in v ? String((v as { name: string }).name) : null);
  const daysLate = (d: Date) => Math.max(1, Math.floor((now.getTime() - new Date(d).getTime()) / DAY));

  const items: AttentionItem[] = [];
  for (const t of tasks) {
    const due = new Date(t.dueAt as Date);
    const late = due < startToday;
    items.push({
      id: `task-${t._id}`,
      kind: late ? 'TASK_OVERDUE' : 'TASK_DUE_TODAY',
      severity: late ? 'high' : 'medium',
      title: t.summary,
      detail: late ? `Overdue by ${daysLate(due)} day(s) · ${pretty(t.type)}` : `Due today · ${pretty(t.type)}`,
      why: late
        ? 'A promised follow-up was missed. The customer may be waiting — reschedule or complete it today.'
        : 'Finishing today keeps commitments on time and the pipeline moving.',
      relatedType: 'Activity',
      relatedId: String(t._id),
      owner: nameOf(t.assignedToId),
      at: due,
      amount: null,
    });
  }
  for (const inv of invoices) {
    const balance = Math.max(0, inv.total - (paid.get(String(inv._id)) ?? 0));
    if (balance <= 0) continue;
    items.push({
      id: `invoice-${inv._id}`,
      kind: 'INVOICE_OVERDUE',
      severity: 'high',
      title: `${inv.invoiceNumber} · ${nameOf(inv.customerId) ?? 'Customer'}`,
      detail: `₹${balance.toLocaleString('en-IN')} unpaid · due ${fmtDate(new Date(inv.dueDate))} (${daysLate(inv.dueDate)} day(s) late)`,
      why: 'Unpaid invoices hurt cash flow, and the longer they age the harder they are to collect. Send a reminder or record the payment.',
      relatedType: 'Invoice',
      relatedId: String(inv._id),
      owner: null,
      at: new Date(inv.dueDate),
      amount: balance,
    });
  }
  for (const d of deals) {
    items.push({
      id: `deal-${d._id}`,
      kind: 'DEAL_OVERDUE',
      severity: 'medium',
      title: d.title,
      detail: `${pretty(d.stage)} · expected close ${fmtDate(new Date(d.closeDate as Date))} · ₹${d.amount.toLocaleString('en-IN')}`,
      why: 'The expected close date has passed, so the forecast is wrong. Update the close date, move the stage, or mark it won/lost.',
      relatedType: 'Opportunity',
      relatedId: String(d._id),
      owner: nameOf(d.ownerId),
      at: new Date(d.closeDate as Date),
      amount: d.amount,
    });
  }
  for (const l of leads) {
    items.push({
      id: `lead-${l._id}`,
      kind: 'LEAD_STALE',
      severity: 'medium',
      title: l.name,
      detail: `${pretty(l.status)} · no update for ${daysLate(l.updatedAt)} day(s)`,
      why: 'Leads go cold quickly — response within a week roughly doubles the chance of converting. Call or e-mail them.',
      relatedType: 'Lead',
      relatedId: String(l._id),
      owner: nameOf(l.assignedToId),
      at: new Date(l.updatedAt),
      amount: null,
    });
  }
  for (const e of events) {
    items.push({
      id: `event-${e._id}`,
      kind: 'EVENT_SOON',
      severity: 'info',
      title: e.title,
      detail: `${pretty(e.type)} · ${new Date(e.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}${e.location ? ` · ${e.location}` : ''}`,
      why: 'Coming up within 48 hours — prepare notes and confirm with attendees.',
      relatedType: 'CalendarEvent',
      relatedId: String(e._id),
      owner: null,
      at: new Date(e.startAt),
      amount: null,
    });
  }

  const order = { high: 0, medium: 1, info: 2 } as const;
  items.sort((a, b) => order[a.severity] - order[b.severity] || (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
  const counts = items.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.severity]: (acc[i.severity] ?? 0) + 1 }), { high: 0, medium: 0, info: 0 });
  return { items, counts };
}
