/**
 * Builds "who did what" work-log entries for records created before
 * v1.4 recorded them, so Team activity and record histories are not
 * empty for existing data. Additive only: nothing is changed or
 * deleted, and a company that already has work-log entries is skipped.
 *
 *   npm run backfill:worklog -- --dry                 # report only
 *   npm run backfill:worklog -- sg-textiles nova-x    # only these company codes
 *   npm run backfill:worklog                          # every company without entries
 */
import mongoose, { Types } from 'mongoose';

import { env } from '@/config/env';

const dryRun = process.argv.includes('--dry');
const slugs = process.argv.slice(2).filter(a => !a.startsWith('--'));

type Entry = {
  companyId: Types.ObjectId;
  actorId: Types.ObjectId | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

async function run() {
  await mongoose.connect(env.mongoUri);
  const db = mongoose.connection.db!;
  const filter = slugs.length ? { slug: { $in: slugs } } : {};
  const companies = await db.collection('companies').find(filter).toArray();

  for (const company of companies) {
    const companyId = company._id as Types.ObjectId;
    const existing = await db.collection('auditlogs').countDocuments({ companyId, action: /^work\./ });
    if (existing > 0) {
      console.log(`[backfill] ${company.slug}: already has ${existing} work entries — skipped`);
      continue;
    }
    const entries: Entry[] = [];
    const add = (e: Omit<Entry, 'companyId'>) => entries.push({ ...e, companyId });

    for (const l of await db.collection('leads').find({ companyId }).toArray()) {
      add({ actorId: l.assignedToId ?? null, action: 'work.lead.created', targetType: 'Lead', targetId: String(l._id), metadata: { label: l.name, source: l.source, backfilled: true }, createdAt: l.createdAt });
      if (l.status && l.status !== 'NEW' && l.status !== 'CONVERTED') {
        add({ actorId: l.assignedToId ?? null, action: 'work.lead.status_changed', targetType: 'Lead', targetId: String(l._id), metadata: { label: l.name, from: 'NEW', to: l.status, backfilled: true }, createdAt: l.updatedAt ?? l.createdAt });
      }
    }
    for (const c of await db.collection('customers').find({ companyId }).toArray()) {
      add({ actorId: c.ownerId ?? null, action: 'work.customer.created', targetType: 'Customer', targetId: String(c._id), metadata: { label: c.name, backfilled: true }, createdAt: c.createdAt });
    }
    for (const d of await db.collection('opportunities').find({ companyId }).toArray()) {
      add({ actorId: d.ownerId ?? null, action: 'work.deal.created', targetType: 'Opportunity', targetId: String(d._id), metadata: { label: d.title, amount: d.amount, stage: 'PROSPECTING', backfilled: true }, createdAt: d.createdAt });
      if (d.stage !== 'PROSPECTING') {
        add({ actorId: d.ownerId ?? null, action: 'work.deal.stage_changed', targetType: 'Opportunity', targetId: String(d._id), metadata: { label: d.title, from: 'PROSPECTING', to: d.stage, amount: d.amount, backfilled: true }, createdAt: d.updatedAt ?? d.createdAt });
      }
    }
    for (const i of await db.collection('invoices').find({ companyId }).toArray()) {
      add({ actorId: i.createdById ?? null, action: 'work.invoice.created', targetType: 'Invoice', targetId: String(i._id), metadata: { label: i.invoiceNumber, total: i.total, backfilled: true }, createdAt: i.createdAt });
    }
    for (const p of await db.collection('payments').find({ companyId }).toArray()) {
      add({ actorId: p.recordedById ?? null, action: 'work.payment.recorded', targetType: 'Payment', targetId: String(p._id), metadata: { label: p.reference ?? null, amount: p.amount, method: p.method, invoiceId: String(p.invoiceId), backfilled: true }, createdAt: p.paidAt ?? p.createdAt });
    }
    for (const a of await db.collection('activities').find({ companyId }).toArray()) {
      add({ actorId: a.createdById ?? null, action: 'work.task.created', targetType: 'Activity', targetId: String(a._id), metadata: { label: a.summary, type: a.type, backfilled: true }, createdAt: a.createdAt });
      if (a.status === 'COMPLETED' && a.completedAt) {
        add({ actorId: a.completedById ?? a.assignedToId ?? null, action: 'work.task.completed', targetType: 'Activity', targetId: String(a._id), metadata: { label: a.summary, type: a.type, backfilled: true }, createdAt: a.completedAt });
      }
    }
    for (const e of await db.collection('calendarevents').find({ companyId }).toArray()) {
      add({ actorId: e.createdById ?? null, action: 'work.event.created', targetType: 'CalendarEvent', targetId: String(e._id), metadata: { label: e.title, type: e.type, backfilled: true }, createdAt: e.createdAt });
    }

    const usable = entries.filter(e => e.actorId && e.createdAt);
    console.log(`[backfill] ${company.slug}: ${usable.length} work entries${dryRun ? ' (dry run)' : ''}`);
    if (!dryRun && usable.length) await db.collection('auditlogs').insertMany(usable);
  }
}

run()
  .catch(err => {
    console.error('[backfill] failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
