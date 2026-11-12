import { api, createMember, registerCompany, startTestServer, type TestContext } from './setup';

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

let ctx: TestContext;
let client: ReturnType<typeof api>;

let owner: Awaited<ReturnType<typeof registerCompany>>;
let otherOwner: Awaited<ReturnType<typeof registerCompany>>;
let manager: Awaited<ReturnType<typeof createMember>>;
let teamlessManager: Awaited<ReturnType<typeof createMember>>;
let repA: Awaited<ReturnType<typeof createMember>>;
let repB: Awaited<ReturnType<typeof createMember>>;
let repOutside: Awaited<ReturnType<typeof createMember>>;
let employee: Awaited<ReturnType<typeof createMember>>;

const dueDate = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

before(async () => {
  ctx = await startTestServer();
  client = api(ctx.baseUrl);

  owner = await registerCompany(client, 'Workflow Co');
  otherOwner = await registerCompany(client, 'Rival Co');
  manager = await createMember(client, owner.accessToken, 'MANAGER');
  teamlessManager = await createMember(client, owner.accessToken, 'MANAGER');
  repA = await createMember(client, owner.accessToken, 'SALES');
  repB = await createMember(client, owner.accessToken, 'SALES');
  repOutside = await createMember(client, owner.accessToken, 'SALES');
  employee = await createMember(client, owner.accessToken, 'EMPLOYEE');
});

after(async () => {
  await ctx.close();
});

/* ============================================================
   TEAMS
============================================================ */

describe('teams and manager scope', () => {
  let teamId: string;
  let leadA: string;
  let leadOutside: string;

  before(async () => {
    leadA = (await client.post('/leads', { name: 'Team lead', email: 'teamlead@example.test' }, repA.accessToken)).body.id;
    leadOutside = (await client.post('/leads', { name: 'Outside lead' }, repOutside.accessToken)).body.id;
  });

  test('OWNER creates a team; members and manager must be valid company users', async () => {
    const bad = await client.post('/teams', { name: 'Bad', managerId: repA.id }, owner.accessToken);
    assert.equal(bad.status, 400, 'a SALES user cannot manage a team');

    const res = await client.post(
      '/teams',
      { name: 'North', territory: 'North India', managerId: manager.id, memberIds: [repA.id, repB.id, repA.id] },
      owner.accessToken,
    );
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.members.length, 2);
    assert.equal(res.body.manager.id, manager.id);
    teamId = res.body.id;
  });

  test('a user from another company cannot be added', async () => {
    const foreign = await client.get('/auth/me', otherOwner.accessToken);
    const res = await client.patch(`/teams/${teamId}`, { memberIds: [repA.id, foreign.body.id] }, owner.accessToken);
    assert.equal(res.status, 400);
  });

  test('only OWNER/ADMIN manage teams; everyone can list them', async () => {
    assert.equal((await client.post('/teams', { name: 'Mine' }, manager.accessToken)).status, 403);
    const list = await client.get<Record<string, any>[]>('/teams', repA.accessToken);
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal((await client.get<Record<string, any>[]>('/teams', otherOwner.accessToken)).body.length, 0);
  });

  test('a team manager sees team members\' leads but not other reps\'', async () => {
    assert.equal((await client.get(`/leads/${leadA}`, manager.accessToken)).status, 200);
    assert.equal((await client.get(`/leads/${leadOutside}`, manager.accessToken)).status, 404);

    const list = await client.get<Record<string, any>[]>('/leads', manager.accessToken);
    const ids = list.body.map(lead => lead.id);
    assert.ok(ids.includes(leadA));
    assert.ok(!ids.includes(leadOutside));
  });

  test('a manager without a team keeps company-wide visibility', async () => {
    assert.equal((await client.get(`/leads/${leadOutside}`, teamlessManager.accessToken)).status, 200);
  });

  test('removing a member from the team removes the manager\'s access', async () => {
    await client.patch(`/teams/${teamId}`, { memberIds: [repB.id] }, owner.accessToken);
    assert.equal((await client.get(`/leads/${leadA}`, manager.accessToken)).status, 404);
    await client.patch(`/teams/${teamId}`, { memberIds: [repA.id, repB.id] }, owner.accessToken);
  });
});

/* ============================================================
   CUSTOMER OWNERSHIP
============================================================ */

describe('customer ownership and sharing', () => {
  let customerOfA: string;

  test('customers are returned with an id and an owner', async () => {
    const res = await client.post('/customers', { name: 'Alpha Traders', email: 'alpha@example.test' }, repA.accessToken);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.match(res.body.id, /^[0-9a-f]{24}$/);
    assert.equal(res.body.ownerId, repA.id);
    assert.equal(res.body.owner.id, repA.id);
    assert.equal(res.body._id, undefined);
    customerOfA = res.body.id;

    const list = await client.get('/customers', repA.accessToken);
    assert.ok(list.body.items.every((c: Record<string, unknown>) => typeof c.id === 'string'));
  });

  test('another rep cannot see, edit or delete it', async () => {
    assert.equal((await client.get(`/customers/${customerOfA}`, repB.accessToken)).status, 404);
    assert.equal((await client.patch(`/customers/${customerOfA}`, { name: 'Hijack' }, repB.accessToken)).status, 404);
    assert.equal((await client.delete(`/customers/${customerOfA}`, repB.accessToken)).status, 404);
    const list = await client.get('/customers', repB.accessToken);
    assert.ok(!list.body.items.some((c: Record<string, unknown>) => c.id === customerOfA));
  });

  test('the owner can share it; the shared user can view but not re-share', async () => {
    const shared = await client.patch(`/customers/${customerOfA}`, { sharedWithIds: [repB.id] }, repA.accessToken);
    assert.equal(shared.status, 200, JSON.stringify(shared.body));
    assert.equal((await client.get(`/customers/${customerOfA}`, repB.accessToken)).status, 200);
    assert.equal(
      (await client.patch(`/customers/${customerOfA}`, { sharedWithIds: [repB.id, repOutside.id] }, repB.accessToken)).status,
      403,
    );
  });

  test('a rep cannot hand a customer to someone else; an owner/admin can', async () => {
    assert.equal((await client.patch(`/customers/${customerOfA}`, { ownerId: repOutside.id }, repA.accessToken)).status, 403);
    const moved = await client.patch(`/customers/${customerOfA}`, { ownerId: repOutside.id }, owner.accessToken);
    assert.equal(moved.status, 200);
    assert.equal(moved.body.ownerId, repOutside.id);
    assert.equal((await client.get(`/customers/${customerOfA}`, repA.accessToken)).status, 404);
    await client.patch(`/customers/${customerOfA}`, { ownerId: repA.id }, owner.accessToken);
  });

  test('a rep always owns customers they create, whatever ownerId they send', async () => {
    const res = await client.post('/customers', { name: 'Beta Corp', ownerId: repB.id }, repA.accessToken);
    assert.equal(res.status, 201);
    assert.equal(res.body.ownerId, repA.id);
  });

  test('invoices follow customer visibility', async () => {
    const invoice = await client.post(
      '/invoices',
      { customerId: customerOfA, lineItems: [{ description: 'Service', quantity: 2, unitPrice: 500 }], taxRate: 18, dueDate: dueDate() },
      owner.accessToken,
    );
    assert.equal(invoice.status, 201, JSON.stringify(invoice.body));
    assert.equal(invoice.body.total, 1180);

    assert.equal((await client.get(`/invoices/${invoice.body.id}`, repA.accessToken)).status, 200);
    assert.equal((await client.get(`/invoices/${invoice.body.id}`, repOutside.accessToken)).status, 404);
    const listed = await client.get<Record<string, any>[]>('/invoices', repOutside.accessToken);
    assert.ok(!listed.body.some(inv => inv.id === invoice.body.id));

    const payment = await client.post('/payments', { invoiceId: invoice.body.id, amount: 100 }, repOutside.accessToken);
    assert.equal(payment.status, 404, 'cannot pay an invoice you cannot see');
  });
});

/* ============================================================
   DUPLICATES
============================================================ */

describe('duplicate detection', () => {
  test('creating a lead with an existing e-mail or phone returns 409', async () => {
    await client.post('/leads', { name: 'Dup One', email: 'dup@example.test', phone: '+91 98765 43210' }, repA.accessToken);

    const byEmail = await client.post('/leads', { name: 'Dup Two', email: 'DUP@example.test' }, repA.accessToken);
    assert.equal(byEmail.status, 409);
    assert.equal(byEmail.body.details.duplicates[0].matchedOn[0], 'email');

    const byPhone = await client.post('/leads', { name: 'Dup Three', phone: '098765-43210' }, repA.accessToken);
    assert.equal(byPhone.status, 409);

    const forced = await client.post('/leads', { name: 'Dup Four', email: 'dup@example.test', allowDuplicate: true }, repA.accessToken);
    assert.equal(forced.status, 201);
  });

  test('duplicates outside your scope are reported without names', async () => {
    const res = await client.get('/leads/duplicates?email=dup@example.test', repB.accessToken);
    assert.equal(res.status, 200);
    assert.ok(res.body.duplicates.length >= 1);
    for (const match of res.body.duplicates) {
      assert.equal(match.visible, false);
      assert.equal(match.name, undefined);
      assert.equal(match.id, undefined);
    }
  });

  test('a customer with the same e-mail as a lead is flagged', async () => {
    const res = await client.post('/customers', { name: 'Dup Customer', email: 'dup@example.test' }, owner.accessToken);
    assert.equal(res.status, 409);
  });

  test('duplicates never cross companies', async () => {
    const res = await client.post('/leads', { name: 'Rival lead', email: 'dup@example.test' }, otherOwner.accessToken);
    assert.equal(res.status, 201);
  });
});

/* ============================================================
   LEAD CONVERSION
============================================================ */

describe('lead conversion', () => {
  test('converts a lead into a customer and a deal owned by the assignee', async () => {
    const lead = await client.post('/leads', { name: 'Convert Me', email: 'convert@example.test', phone: '9000000001' }, repA.accessToken);
    assert.equal(lead.status, 201);

    const res = await client.post(
      `/leads/${lead.body.id}/convert`,
      { deal: { title: 'First order', amount: 25000 } },
      repA.accessToken,
    );
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.lead.status, 'CONVERTED');
    assert.equal(res.body.createdCustomer, true);

    const customer = await client.get(`/customers/${res.body.customerId}`, repA.accessToken);
    assert.equal(customer.status, 200);
    assert.equal(customer.body.email, 'convert@example.test');
    assert.equal(customer.body.ownerId, repA.id);

    const deal = await client.get(`/opportunities/${res.body.opportunityId}`, repA.accessToken);
    assert.equal(deal.status, 200);
    assert.equal(deal.body.amount, 25000);
    assert.equal(deal.body.ownerId, repA.id);
    assert.equal(deal.body.customerId, res.body.customerId);

    const again = await client.post(`/leads/${lead.body.id}/convert`, {}, repA.accessToken);
    assert.equal(again.status, 409);
  });

  test('can attach to an existing customer without creating a deal', async () => {
    const customer = await client.post('/customers', { name: 'Existing Ltd' }, repA.accessToken);
    const lead = await client.post('/leads', { name: 'Upsell lead' }, repA.accessToken);
    const res = await client.post(
      `/leads/${lead.body.id}/convert`,
      { customerId: customer.body.id, createDeal: false },
      repA.accessToken,
    );
    assert.equal(res.status, 201);
    assert.equal(res.body.customerId, customer.body.id);
    assert.equal(res.body.opportunityId, null);
    assert.equal(res.body.createdCustomer, false);
  });

  test('cannot convert someone else\'s lead, a lost lead, or into a foreign customer', async () => {
    const lead = await client.post('/leads', { name: 'Not yours' }, repA.accessToken);
    assert.equal((await client.post(`/leads/${lead.body.id}/convert`, {}, repB.accessToken)).status, 404);
    assert.equal((await client.post(`/leads/${lead.body.id}/convert`, {}, employee.accessToken)).status, 403);

    const foreignCustomer = await client.post('/customers', { name: 'Rival customer' }, otherOwner.accessToken);
    assert.equal(
      (await client.post(`/leads/${lead.body.id}/convert`, { customerId: foreignCustomer.body.id }, repA.accessToken)).status,
      400,
    );

    await client.patch(`/leads/${lead.body.id}/status`, { status: 'LOST' }, repA.accessToken);
    assert.equal((await client.post(`/leads/${lead.body.id}/convert`, {}, repA.accessToken)).status, 400);
  });
});

/* ============================================================
   CSV
============================================================ */

describe('CSV import and export', () => {
  test('dry run validates without saving and reports row errors', async () => {
    const csv = [
      'Name,Email,Phone,Source,Status',
      'Good One,good1@example.test,9111111111,website,new',
      ',missing@example.test,,,',
      'Bad Email,not-an-email,,,',
      'Bad Source,src@example.test,,TELEPATHY,',
    ].join('\n');

    const res = await client.post('/leads/import', { csv, dryRun: true }, repA.accessToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.total, 4);
    assert.equal(res.body.created, 1);
    assert.equal(res.body.failed, 3);
    assert.deepEqual(res.body.errors.map((e: { row: number }) => e.row), [3, 4, 5]);

    const list = await client.get<Record<string, any>[]>('/leads', repA.accessToken);
    assert.ok(!list.body.some(lead => lead.name === 'Good One'), 'dry run must not save');
  });

  test('import saves valid rows, skips duplicates (in DB and in file), handles quotes', async () => {
    const csv = [
      'name,email,phone,source',
      '"Quoted, Name",quoted@example.test,9222222222,REFERRAL',
      'Dup In DB,dup@example.test,,',
      'Same File A,samefile@example.test,,',
      'Same File B,samefile@example.test,,',
    ].join('\r\n');

    const res = await client.post('/leads/import', { csv }, repA.accessToken);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.created, 2);
    assert.equal(res.body.skippedDuplicates, 2);

    const list = await client.get<Record<string, any>[]>('/leads', repA.accessToken);
    const quoted = list.body.find(lead => lead.name === 'Quoted, Name');
    assert.ok(quoted);
    assert.equal(quoted.assignedToId, repA.id, 'SALES imports are assigned to the importer');
    assert.equal(quoted.source, 'REFERRAL');
  });

  test('a rep cannot import leads for another user', async () => {
    const csv = `name,assignedToEmail\nSneaky,${repB.email}\n`;
    const res = await client.post('/leads/import', { csv }, repA.accessToken);
    assert.equal(res.body.created, 0);
    assert.equal(res.body.failed, 1);
  });

  test('customer import assigns owners by e-mail for admins', async () => {
    const csv = `name,email,ownerEmail\nImported Customer,imported@example.test,${repB.email}\n`;
    const res = await client.post('/customers/import', { csv }, owner.accessToken);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.created, 1);
    const visible = await client.get('/customers?search=Imported', repB.accessToken);
    assert.equal(visible.body.items.length, 1);
  });

  test('export is role-gated, scoped, and neutralises spreadsheet formulas', async () => {
    assert.equal((await client.get('/leads/export', repA.accessToken)).status, 403);
    assert.equal((await client.get('/customers/export', employee.accessToken)).status, 403);

    await client.post('/leads', { name: '=HYPERLINK("http://evil.test","x")' }, owner.accessToken);

    const res = await fetch(`${ctx.baseUrl}/leads/export`, { headers: { Authorization: `Bearer ${owner.accessToken}` } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/csv/);
    assert.match(res.headers.get('content-disposition') ?? '', /attachment; filename="leads-/);
    // Read raw bytes: Response.text() silently drops the BOM.
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'UTF-8 BOM for Excel');
    const text = bytes.toString('utf8');
    assert.ok(text.startsWith('﻿name,email'));
    assert.ok(text.includes(`"'=HYPERLINK(""http://evil.test"",""x"")"`), 'formula must be prefixed');

    const scoped = await fetch(`${ctx.baseUrl}/leads/export`, { headers: { Authorization: `Bearer ${manager.accessToken}` } });
    const scopedText = await scoped.text();
    assert.ok(!scopedText.includes('Outside lead'), 'team manager export is team-scoped');
  });

  test('rejects malformed files', async () => {
    assert.equal((await client.post('/leads/import', { csv: 'email\nx@y.z' }, owner.accessToken)).status, 400);
    assert.equal((await client.post('/leads/import', { csv: 'name\n"unterminated' }, owner.accessToken)).status, 400);
    assert.equal((await client.post('/leads/import', { csv: 'name\n' }, owner.accessToken)).status, 400);
  });
});
