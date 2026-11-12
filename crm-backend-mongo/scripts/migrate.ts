/**
 * One-off, idempotent data migration for the branding/security release.
 *
 *   npm run migrate            # apply
 *   npm run migrate -- --dry   # report only
 *
 * 1. Gives every company without a `slug` (company code) a unique one.
 * 2. Fills in default `branding`, timezone, locale and currency.
 * 3. Removes legacy refresh tokens stored in plaintext (pre-`tokenHash`).
 *    Affected users simply sign in again once.
 * 4. Customers without an owner get the assignee of their most recent
 *    lead or deal (so SALES users keep seeing their customers); others
 *    stay unowned = visible to OWNER / ADMIN / un-teamed managers only.
 * 5. Backfills normalised phone digits and lower-case lead e-mails
 *    used by duplicate detection.
 * 6. Builds the indexes declared on the models.
 *
 * Safe to run repeatedly. Always take a backup first (docs/DEPLOYMENT.md).
 */
import mongoose from 'mongoose';

import { env } from '@/config/env';
import {
  AuditLog,
  Company,
  Customer,
  Lead,
  Opportunity,
  PasswordResetToken,
  RefreshToken,
  Team,
  User,
} from '@/models';
import { normalizePhone } from '@/models/shared';
import { uniqueCompanySlug } from '@/models/Company.model';

const dryRun = process.argv.includes('--dry');

async function run() {
  await mongoose.connect(env.mongoUri);
  console.log(`[migrate] connected${dryRun ? ' (dry run)' : ''}`);

  const companies = await Company.find({
    $or: [
      { slug: { $exists: false } },
      { slug: null },
      { slug: '' },
      { branding: { $exists: false } },
    ],
  });

  for (const company of companies) {
    const slug = company.slug || (await uniqueCompanySlug(company.name));
    console.log(`[migrate] company ${company._id}: slug=${slug}`);
    if (!dryRun) {
      await Company.updateOne(
        { _id: company._id },
        {
          $set: {
            slug,
            branding: company.branding ?? {},
            timezone: company.timezone ?? 'Asia/Kolkata',
            locale: company.locale ?? 'en-IN',
            currency: company.currency ?? 'INR',
          },
        },
        { runValidators: true },
      );
    }
  }

  const legacyTokens = await RefreshToken.collection.countDocuments({
    tokenHash: { $exists: false },
  });
  console.log(`[migrate] legacy plaintext refresh tokens: ${legacyTokens}`);
  if (!dryRun && legacyTokens > 0) {
    await RefreshToken.collection.deleteMany({ tokenHash: { $exists: false } });
  }

  /* ---- customer owners ---- */
  const unowned = await Customer.find({
    $or: [{ ownerId: null }, { ownerId: { $exists: false } }],
  }).select('_id');

  let assigned = 0;
  for (const customer of unowned) {
    const [lead, deal] = await Promise.all([
      Lead.findOne({ customerId: customer._id, assignedToId: { $ne: null } })
        .sort({ updatedAt: -1 })
        .select('assignedToId updatedAt')
        .lean(),
      Opportunity.findOne({ customerId: customer._id, ownerId: { $ne: null } })
        .sort({ updatedAt: -1 })
        .select('ownerId updatedAt')
        .lean(),
    ]);

    const owner =
      lead && deal
        ? lead.updatedAt > deal.updatedAt
          ? lead.assignedToId
          : deal.ownerId
        : (lead?.assignedToId ?? deal?.ownerId ?? null);

    if (owner) {
      assigned += 1;
      if (!dryRun) {
        await Customer.updateOne({ _id: customer._id }, { $set: { ownerId: owner } });
      }
    }
  }
  console.log(`[migrate] unowned customers: ${unowned.length}, owner assigned: ${assigned}`);

  /* ---- duplicate-detection fields ---- */
  let normalised = 0;
  for (const model of [Lead, Customer]) {
    const docs = await (model as typeof Lead)
      .find({ phone: { $nin: [null, ''] }, phoneDigits: null })
      .select('phone')
      .lean();
    normalised += docs.length;
    if (!dryRun) {
      for (const doc of docs) {
        await (model as typeof Lead).updateOne(
          { _id: doc._id },
          { $set: { phoneDigits: normalizePhone(doc.phone) } },
        );
      }
    }
  }

  const mixedCaseEmails = await Lead.find({ email: { $regex: /[A-Z]/ } }).select('email').lean();
  if (!dryRun) {
    for (const lead of mixedCaseEmails) {
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { email: String(lead.email).trim().toLowerCase() } },
      );
    }
  }
  console.log(
    `[migrate] phone digits backfilled: ${normalised}, lead e-mails lower-cased: ${mixedCaseEmails.length}`,
  );

  /* ---- tasks without assignee belong to their creator (v1.3.1) ---- */
  const activities = mongoose.connection.db!.collection('activities');
  const unassignedFilter = { assignedToId: null, createdById: { $ne: null } };
  const unassignedTasks = await activities.countDocuments(unassignedFilter);
  if (!dryRun && unassignedTasks) {
    await activities.updateMany(unassignedFilter, [{ $set: { assignedToId: '$createdById' } }]);
  }
  console.log(`[migrate] tasks given their creator as assignee: ${unassignedTasks}`);

  if (!dryRun) {
    for (const model of [Company, User, RefreshToken, PasswordResetToken, AuditLog, Team, Customer, Lead]) {
      await model.syncIndexes();
    }
    console.log('[migrate] indexes synced');
  }

  console.log(`[migrate] done: ${companies.length} companies updated`);
}

run()
  .catch(err => {
    console.error('[migrate] failed', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
