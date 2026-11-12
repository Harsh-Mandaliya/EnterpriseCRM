import { api, createMember, registerCompany, startTestServer, type TestContext } from './setup';

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

/* v1.4 — hierarchy for tasks and calendar, work log, team
   performance, receivables, needs-attention alerts, billing. */

let ctx: TestContext;
let client: ReturnType<typeof api>;
let owner: Awaited<ReturnType<typeof registerCompany>>;
let rival: Awaited<ReturnType<typeof registerCompany>>;
let manager: Awaited<ReturnType<typeof createMember>>;
let repIn: Awaited<ReturnType<typeof createMember>>;
let repOut: Awaited<ReturnType<typeof createMember>>;
let customerIn: string;
let dealIn: string;
let invoiceIn: string;

const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const list = (b: unknown) => (Array.isArray(b) ? b : ((b as { items?: unknown[] }).items ?? [])) as Record<string, any>[];

before(async () => {
  ctx = await startTestServer();
  client = api(ctx.baseUrl);
  owner = await registerCompany(client, 'Insight Co');
  rival = await registerCompany(client, 'Rival Insight Co');
  manager = await createMember(client, owner.accessToken, 'MANAGER');
  repIn = await createMember(client, owner.accessToken, 'SALES');
  repOut = await createMember(client, owner.accessToken, 'SALES');
  const team = await client.post('/teams', { name: 'North', managerId: manager.id, memberIds: [repIn.id] }, owner.accessToken);
  assert.equal(team.status, 201, JSON.stringify(team.body));

  customerIn = (await client.post('/customers', { name: 'Acme Buyers', email: 'buy@acme.test' }, repIn.accessToken)).body.id;
  const deal = await client.post('/opportunities', { title: 'Acme order', amount: 50000, customerId: customerIn, closeDate: iso(-3) }, repIn.accessToken);
  dealIn = deal.body.id;
  const inv = await client.post(
    '/invoices',
    { customerId: customerIn, lineItems: [{ description: 'Widgets', quantity: 10, unitPrice: 1000 }], taxRate: 18, dueDate: iso(-10) },
    repIn.accessToken,
  );
  assert.equal(inv.status, 201, JSON.stringify(inv.body));
  invoiceIn = inv.body.id;
  await client.post('/payments', { invoiceId: invoiceIn, amount: 5000, method: 'UPI' }, repIn.accessToken);
});

after(async () => {
  await ctx.close();
});

describe('task hierarchy', () => {
  let repTask: string;
  let outTask: string;

  before(async () => {
    repTask = (await client.post('/activities', { type: 'TASK', summary: 'In-team task', dueAt: iso(-1) }, repIn.accessToken)).body.id;
    outTask = (await client.post('/activities', { type: 'TASK', summary: 'Outside task' }, repOut.accessToken)).body.id;
  });

  test('a rep sees only their own tasks', async () => {
    const tasks = list((await client.get('/activities', repIn.accessToken)).body);
    assert.ok(tasks.some(t => t.id === repTask));
    assert.ok(!tasks.some(t => t.id === outTask));
  });

  test('a rep cannot complete a colleague\'s task', async () => {
    assert.equal((await client.patch(`/activities/${outTask}/complete`, {}, repIn.accessToken)).status, 404);
  });

  test('the team manager sees team tasks but not outside ones; OWNER sees all', async () => {
    const mgr = list((await client.get('/activities', manager.accessToken)).body);
    assert.ok(mgr.some(t => t.id === repTask) && !mgr.some(t => t.id === outTask));
    const all = list((await client.get('/activities', owner.accessToken)).body);
    assert.ok(all.some(t => t.id === repTask) && all.some(t => t.id === outTask));
  });
});

describe('calendar hierarchy', () => {
  test('company events are shared; private events follow the hierarchy; invitations are visible', async () => {
    const mk = (title: string, token: string, attendeeIds: string[] = []) =>
      client.post('/calendar', { title, type: 'MEETING', startAt: iso(1), endAt: iso(1.05), attendeeIds }, token);
    const company = (await mk('All hands', owner.accessToken)).body.id;
    const outPrivate = (await mk('Out rep meeting', repOut.accessToken)).body.id;
    const invite = (await mk('Out rep invites in rep', repOut.accessToken, [repIn.id])).body.id;

    const seen = list((await client.get('/calendar', repIn.accessToken)).body).map(e => e.id);
    assert.ok(seen.includes(company), 'company event visible');
    assert.ok(seen.includes(invite), 'invited event visible');
    assert.ok(!seen.includes(outPrivate), "colleague's private event hidden");
  });
});

describe('work log', () => {
  test('stage changes are recorded with who did it and from/to', async () => {
    const moved = await client.patch(`/opportunities/${dealIn}/stage`, { stage: 'PROPOSAL' }, repIn.accessToken);
    assert.equal(moved.status, 200, JSON.stringify(moved.body));
    const log = await client.get(`/reports/work-log?targetType=Opportunity&targetId=${dealIn}`, manager.accessToken);
    assert.equal(log.status, 200, JSON.stringify(log.body));
    const entry = list(log.body).find(e => e.action === 'deal.stage_changed');
    assert.ok(entry, JSON.stringify(log.body));
    assert.equal(entry.actor.id, repIn.id);
    assert.equal(entry.details.from, 'PROSPECTING');
    assert.equal(entry.details.to, 'PROPOSAL');
  });

  test('a rep only sees their own actions; another rep cannot open the record history', async () => {
    const mine = list((await client.get('/reports/work-log', repOut.accessToken)).body);
    assert.ok(mine.every(e => e.actor?.id === repOut.id));
    assert.equal((await client.get(`/reports/work-log?targetType=Opportunity&targetId=${dealIn}`, repOut.accessToken)).status, 404);
    assert.equal((await client.get(`/reports/work-log?userId=${repIn.id}`, repOut.accessToken)).status, 404);
  });

  test('another company cannot read the history', async () => {
    assert.equal((await client.get(`/reports/work-log?targetType=Invoice&targetId=${invoiceIn}`, rival.accessToken)).status, 404);
    assert.equal(list((await client.get('/reports/work-log', rival.accessToken)).body).filter(e => e.targetId === dealIn).length, 0);
  });
});

describe('team performance', () => {
  test('rep sees only themself, manager the team, owner everyone', async () => {
    const rep = (await client.get('/reports/team-performance', repIn.accessToken)).body;
    assert.deepEqual(rep.members.map((m: any) => m.user.id), [repIn.id]);
    const me = rep.members[0];
    assert.equal(me.deals.open, 1);
    assert.equal(me.deals.overdue, 1, 'open deal past its close date');
    const mgrIds = (await client.get('/reports/team-performance', manager.accessToken)).body.members.map((m: any) => m.user.id);
    assert.ok(mgrIds.includes(repIn.id) && mgrIds.includes(manager.id) && !mgrIds.includes(repOut.id));
    const all = (await client.get('/reports/team-performance', owner.accessToken)).body;
    assert.ok(all.members.length >= 4);
    assert.equal(all.totals.collected, 5000);
  });

  test('flags what was not done', async () => {
    const rep = (await client.get('/reports/team-performance', repIn.accessToken)).body.members[0];
    assert.ok(rep.flags.some((f: string) => f.includes('overdue task')), JSON.stringify(rep.flags));
  });
});

describe('receivables', () => {
  test('totals, aging and per-customer balances', async () => {
    const r = (await client.get('/reports/receivables', owner.accessToken)).body;
    assert.equal(r.totals.invoiced, 11800);
    assert.equal(r.totals.collected, 5000);
    assert.equal(r.totals.outstanding, 6800);
    assert.equal(r.totals.overdue, 6800);
    assert.equal(r.aging.d1_30, 6800);
    assert.equal(r.byCustomer[0].name, 'Acme Buyers');
    assert.equal(r.byMethod[0].method, 'UPI');
  });

  test('the outside rep and the rival company see none of it', async () => {
    assert.equal((await client.get('/reports/receivables', repOut.accessToken)).body.totals.invoiced, 0);
    assert.equal((await client.get('/reports/receivables', rival.accessToken)).body.totals.invoiced, 0);
  });
});

describe('needs attention', () => {
  test('lists overdue invoice and task with the reason, scoped to the user', async () => {
    const res = await client.get('/notifications/attention', repIn.accessToken);
    assert.equal(res.status, 200);
    const kinds = res.body.items.map((i: any) => i.kind);
    assert.ok(kinds.includes('INVOICE_OVERDUE'), JSON.stringify(kinds));
    assert.ok(kinds.includes('TASK_OVERDUE'));
    assert.ok(kinds.includes('DEAL_OVERDUE'));
    const inv = res.body.items.find((i: any) => i.kind === 'INVOICE_OVERDUE');
    assert.equal(inv.amount, 6800);
    assert.match(inv.why, /cash flow/);
    assert.equal(res.body.items[0].severity, 'high');

    const other = (await client.get('/notifications/attention', repOut.accessToken)).body.items;
    assert.ok(!other.some((i: any) => i.relatedId === invoiceIn));
    assert.equal((await client.get('/notifications/attention', rival.accessToken)).body.items.length, 0);
  });
});

describe('company billing details', () => {
  test('OWNER sets them, they come back with branding; GSTIN validated; ADMIN cannot', async () => {
    const ok = await client.patch(
      '/company/profile',
      { billing: { legalName: 'Insight Co Pvt Ltd', address: 'MG Road, Pune', gstin: '27aabcu9603r1zm', phone: '+91 20 1234 5678' } },
      owner.accessToken,
    );
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.company.billing.gstin, '27AABCU9603R1ZM');
    const branding = (await client.get('/company/branding', repIn.accessToken)).body;
    assert.equal(branding.company.billing.address, 'MG Road, Pune');
    assert.equal((await client.patch('/company/profile', { billing: { gstin: 'BAD' } }, owner.accessToken)).status, 400);
    const admin = await createMember(client, owner.accessToken, 'ADMIN');
    assert.equal((await client.patch('/company/profile', { billing: { address: 'x' } }, admin.accessToken)).status, 403);
    const pub = await client.get(`/company/public/${(branding.company as { slug: string }).slug}`);
    assert.ok(!JSON.stringify(pub.body).includes('MG Road'), 'billing never in public lookup');
  });
});

describe('AI deal insights and briefing', () => {
  test('rep gets probability, reasons and next step for own deals only', async () => {
    const res = await client.get('/ai/deal-insights', repIn.accessToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const deal = res.body.deals.find((d: any) => d.id === dealIn);
    assert.ok(deal, 'own deal present');
    assert.ok(deal.probability >= 5 && deal.probability <= 95);
    assert.ok(deal.signals.some((s: any) => /overdue invoices/.test(s.label)), JSON.stringify(deal.signals));
    assert.ok(deal.signals.some((s: any) => /Close date passed/.test(s.label)));
    assert.match(deal.nextStep, /close date/i);
    assert.equal((await client.get('/ai/deal-insights', repOut.accessToken)).body.deals.some((d: any) => d.id === dealIn), false);
    assert.equal((await client.get('/ai/deal-insights', rival.accessToken)).body.deals.length, 0);
  });

  test('briefing summarises the scope in plain language', async () => {
    const res = await client.get('/ai/briefing', repIn.accessToken);
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.headline === 'string' && res.body.headline.length > 0);
    assert.ok(res.body.points.some((p: any) => /overdue/.test(p.text)), JSON.stringify(res.body.points));
  });
});
