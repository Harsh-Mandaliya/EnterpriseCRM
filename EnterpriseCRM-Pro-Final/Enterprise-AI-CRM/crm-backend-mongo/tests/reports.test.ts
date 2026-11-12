import { api, createMember, registerCompany, startTestServer, type TestContext } from './setup';

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

let ctx: TestContext;
let client: ReturnType<typeof api>;

let owner: Awaited<ReturnType<typeof registerCompany>>;
let manager: Awaited<ReturnType<typeof createMember>>;
let teamlessManager: Awaited<ReturnType<typeof createMember>>;
let teamRep: Awaited<ReturnType<typeof createMember>>;
let outsideRep: Awaited<ReturnType<typeof createMember>>;

const ids: Record<string, string> = {};

const dueDate = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

/** Creates a customer, a WON deal and a PAID invoice owned by `rep`. */
async function seedSales(rep: { accessToken: string }, label: string, amount: number) {
  const customer = await client.post('/customers', { name: `${label} Customer` }, rep.accessToken);
  assert.equal(customer.status, 201, JSON.stringify(customer.body));

  const lead = await client.post('/leads', { name: `${label} Lead`, source: 'REFERRAL' }, rep.accessToken);
  assert.equal(lead.status, 201, JSON.stringify(lead.body));

  const openDeal = await client.post('/opportunities', { title: `${label} open deal`, amount }, rep.accessToken);
  const wonDeal = await client.post('/opportunities', { title: `${label} won deal`, amount, stage: 'WON' }, rep.accessToken);
  assert.equal(wonDeal.status, 201, JSON.stringify(wonDeal.body));

  const invoice = await client.post(
    '/invoices',
    { customerId: customer.body.id, lineItems: [{ description: 'Work', quantity: 1, unitPrice: amount }], dueDate: dueDate() },
    rep.accessToken,
  );
  assert.equal(invoice.status, 201, JSON.stringify(invoice.body));
  const paid = await client.patch(`/invoices/${invoice.body.id}/status`, { status: 'PAID' }, rep.accessToken);
  assert.equal(paid.status, 200, JSON.stringify(paid.body));

  ids[`${label}Customer`] = customer.body.id;
  ids[`${label}Lead`] = lead.body.id;
  ids[`${label}OpenDeal`] = openDeal.body.id;
  ids[`${label}Invoice`] = invoice.body.id;
}

before(async () => {
  ctx = await startTestServer();
  client = api(ctx.baseUrl);

  owner = await registerCompany(client, 'Reports Co');
  manager = await createMember(client, owner.accessToken, 'MANAGER');
  teamlessManager = await createMember(client, owner.accessToken, 'MANAGER');
  teamRep = await createMember(client, owner.accessToken, 'SALES');
  outsideRep = await createMember(client, owner.accessToken, 'SALES');

  const team = await client.post('/teams', { name: 'Alpha', managerId: manager.id, memberIds: [teamRep.id] }, owner.accessToken);
  assert.equal(team.status, 201, JSON.stringify(team.body));

  await seedSales(teamRep, 'Team', 1000);
  await seedSales(outsideRep, 'Outside', 5000);
});

after(async () => {
  await ctx.close();
});

describe('manager dashboard', () => {
  test('a team manager sees team figures, not company or outside-team figures', async () => {
    const res = await client.get('/dashboard/manager-summary', manager.accessToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.teamSize, 2);
    assert.equal(res.body.teamLeads, 1);
    assert.equal(res.body.openDeals, 1);
    assert.equal(res.body.pipelineRevenue, 1000);
    assert.equal(res.body.wonDeals, 1);
    assert.equal(res.body.totalWonRevenue, 1000);
  });

  test('a manager without a team sees only their own figures', async () => {
    const res = await client.get('/dashboard/manager-summary', teamlessManager.accessToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.teamSize, 1);
    assert.equal(res.body.teamLeads, 0);
    assert.equal(res.body.totalWonRevenue, 0);
  });
});

describe('reports', () => {
  test('lead conversion report is team-scoped for a team manager', async () => {
    const team = await client.get<Record<string, any>[]>('/reports/leads', manager.accessToken);
    const company = await client.get<Record<string, any>[]>('/reports/leads', owner.accessToken);
    const total = (rows: Record<string, any>[]) => rows.reduce((sum, r) => sum + r.total, 0);
    assert.equal(total(team.body), 1);
    assert.equal(total(company.body), 2);
  });

  test('deals report is team-scoped', async () => {
    const team = await client.get('/reports/deals', manager.accessToken);
    const company = await client.get('/reports/deals', owner.accessToken);
    assert.equal(team.body.totalWon, 1);
    assert.equal(company.body.totalWon, 2);
  });

  test('sales and top-customers reports only include the team’s invoices', async () => {
    const sales = await client.get<Record<string, any>[]>('/reports/sales', manager.accessToken);
    assert.equal(sales.body.reduce((sum, r) => sum + r.revenue, 0), 1000);

    const top = await client.get<Record<string, any>[]>('/reports/top-customers', manager.accessToken);
    const names = top.body.map(r => r.customerName);
    assert.deepEqual(names, ['Team Customer']);

    const all = await client.get<Record<string, any>[]>('/reports/top-customers', owner.accessToken);
    assert.deepEqual(all.body.map(r => r.customerName).sort(), ['Outside Customer', 'Team Customer']);
  });

  test('a teamless manager keeps company-wide reports', async () => {
    const res = await client.get('/reports/deals', teamlessManager.accessToken);
    assert.equal(res.body.totalWon, 2);
  });
});

describe('AI endpoints', () => {
  test('lead scores only cover leads in scope', async () => {
    const team = await client.get<Record<string, any>[]>('/ai/lead-scores', manager.accessToken);
    const leadIds = team.body.map(r => r.leadId);
    assert.ok(leadIds.includes(ids.TeamLead));
    assert.ok(!leadIds.includes(ids.OutsideLead));
  });

  test('sales forecast history only uses the team’s revenue', async () => {
    const res = await client.get('/ai/sales-forecast', manager.accessToken);
    assert.equal(res.status, 200);
    const revenue = res.body.history.reduce((sum: number, r: { revenue: number }) => sum + r.revenue, 0);
    assert.equal(revenue, 1000);
  });

  test('customer insights never name customers outside the team', async () => {
    const res = await client.get('/ai/customer-insights', manager.accessToken);
    assert.equal(res.status, 200);
    const names = res.body.atRiskCustomers.map((c: { name: string }) => c.name);
    assert.ok(names.includes('Team Customer'));
    assert.ok(!names.includes('Outside Customer'));
  });

  test('next-best-actions for a SALES rep never reference colleagues’ records', async () => {
    // Make the outside rep's lead stale and their invoice overdue so they
    // would be picked up if the query were not scoped.
    const mongoose = (await import('mongoose')).default;
    const old = new Date(Date.now() - 30 * 86_400_000);
    await mongoose.connection.collection('leads').updateMany({}, { $set: { updatedAt: old } });
    await mongoose.connection
      .collection('invoices')
      .updateMany({}, { $set: { status: 'PENDING', dueDate: old } });

    const res = await client.get<Record<string, any>[]>('/ai/next-best-actions', teamRep.accessToken);
    assert.equal(res.status, 200);
    const related = res.body.map(a => a.relatedId);
    assert.ok(related.includes(ids.TeamLead), 'own stale lead is suggested');
    assert.ok(related.includes(ids.TeamInvoice), 'own overdue invoice is suggested');
    assert.ok(!related.includes(ids.OutsideLead), 'colleague lead must not leak');
    assert.ok(!related.includes(ids.OutsideInvoice), 'colleague invoice must not leak');
    assert.ok(!JSON.stringify(res.body).includes('Outside'), 'no colleague names in messages');
  });
});
