import { api, createMember, registerCompany, startTestServer, type TestContext } from './setup';

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

let ctx: TestContext;
let client: ReturnType<typeof api>;

// Company A with a full team, company B as the "attacker" tenant.
let ownerA: Awaited<ReturnType<typeof registerCompany>>;
let ownerB: Awaited<ReturnType<typeof registerCompany>>;
let adminA: Awaited<ReturnType<typeof createMember>>;
let admin2A: Awaited<ReturnType<typeof createMember>>;
let salesA: Awaited<ReturnType<typeof createMember>>;
let sales2A: Awaited<ReturnType<typeof createMember>>;
let employeeA: Awaited<ReturnType<typeof createMember>>;
let customerA: string;
let leadOfSales: string;

before(async () => {
  ctx = await startTestServer();
  client = api(ctx.baseUrl);

  ownerA = await registerCompany(client, 'Company A');
  ownerB = await registerCompany(client, 'Company B');
  adminA = await createMember(client, ownerA.accessToken, 'ADMIN');
  admin2A = await createMember(client, ownerA.accessToken, 'ADMIN');
  salesA = await createMember(client, ownerA.accessToken, 'SALES');
  sales2A = await createMember(client, ownerA.accessToken, 'SALES');
  employeeA = await createMember(client, ownerA.accessToken, 'EMPLOYEE');

  const customer = await client.post('/customers', { name: 'Customer of A' }, ownerA.accessToken);
  assert.equal(customer.status, 201, JSON.stringify(customer.body));
  customerA = customer.body.id;

  const lead = await client.post('/leads', { name: 'Lead for sales rep' }, salesA.accessToken);
  assert.equal(lead.status, 201, JSON.stringify(lead.body));
  leadOfSales = lead.body.id;
});

after(async () => {
  await ctx.close();
});

describe('cross-company isolation', () => {
  test('another company cannot read a lead by guessing its id', async () => {
    const res = await client.get(`/leads/${leadOfSales}`, ownerB.accessToken);
    assert.equal(res.status, 404);
  });

  test('another company cannot update or delete the record', async () => {
    assert.equal((await client.patch(`/leads/${leadOfSales}`, { name: 'pwned' }, ownerB.accessToken)).status, 404);
    assert.equal((await client.delete(`/leads/${leadOfSales}`, ownerB.accessToken)).status, 404);
    assert.equal((await client.get(`/customers/${customerA}`, ownerB.accessToken)).status, 404);
  });

  test('cannot attach records to another company\'s customer or user', async () => {
    const viaCustomer = await client.post('/leads', { name: 'x', customerId: customerA }, ownerB.accessToken);
    assert.equal(viaCustomer.status, 400);

    const viaUser = await client.post('/leads', { name: 'x', assignedToId: salesA.id }, ownerB.accessToken);
    assert.equal(viaUser.status, 400);

    const viaInvoice = await client.post(
      '/invoices',
      {
        customerId: customerA,
        lineItems: [{ description: 'x', quantity: 1, unitPrice: 10 }],
        dueDate: new Date(Date.now() + 86_400_000).toISOString(),
      },
      ownerB.accessToken,
    );
    assert.equal(viaInvoice.status, 400);
  });

  test('lists only ever contain the caller\'s company', async () => {
    const leads = await client.get<Record<string, any>[]>('/leads', ownerB.accessToken);
    assert.equal(leads.status, 200);
    assert.equal(leads.body.length, 0);

    const users = await client.get<Record<string, any>[]>('/users', ownerB.accessToken);
    assert.equal(users.body.length, 1);
  });
});

describe('record ownership for SALES', () => {
  test('a rep sees their own lead but not a colleague\'s', async () => {
    assert.equal((await client.get(`/leads/${leadOfSales}`, salesA.accessToken)).status, 200);
    assert.equal((await client.get(`/leads/${leadOfSales}`, sales2A.accessToken)).status, 404);

    const list = await client.get<Record<string, any>[]>('/leads', sales2A.accessToken);
    assert.ok(list.body.every(lead => lead.assignedToId === sales2A.id));
  });

  test('a rep cannot widen the filter with ?assignedToId=', async () => {
    const list = await client.get<Record<string, any>[]>(`/leads?assignedToId=${salesA.id}`, sales2A.accessToken);
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 0);
  });

  test('a rep cannot modify a colleague\'s lead', async () => {
    const res = await client.patch(`/leads/${leadOfSales}/status`, { status: 'LOST' }, sales2A.accessToken);
    assert.equal(res.status, 404);
  });

  test('owner sees every lead in the company', async () => {
    assert.equal((await client.get(`/leads/${leadOfSales}`, ownerA.accessToken)).status, 200);
  });
});

describe('role permissions', () => {
  test('EMPLOYEE cannot create business records', async () => {
    assert.equal((await client.post('/leads', { name: 'nope' }, employeeA.accessToken)).status, 403);
    assert.equal((await client.post('/customers', { name: 'nope' }, employeeA.accessToken)).status, 403);
  });

  test('dashboards are restricted by role', async () => {
    assert.equal((await client.get('/dashboard/summary', employeeA.accessToken)).status, 403);
    assert.equal((await client.get('/dashboard/admin-summary', salesA.accessToken)).status, 403);
    assert.equal((await client.get('/dashboard/manager-summary', salesA.accessToken)).status, 403);
    assert.equal((await client.get('/dashboard/admin-summary', adminA.accessToken)).status, 200);
    assert.equal((await client.get('/dashboard/employee-summary', employeeA.accessToken)).status, 200);
  });

  test('reports are restricted to OWNER/ADMIN/MANAGER', async () => {
    assert.equal((await client.get('/reports/sales', salesA.accessToken)).status, 403);
  });

  test('SALES cannot manage the team', async () => {
    const res = await client.post(
      '/users',
      { name: 'Sneaky', email: 'sneaky@example.test', password: 'Str0ngPassw0rd', role: 'ADMIN' },
      salesA.accessToken,
    );
    assert.equal(res.status, 403);
  });

  test('ADMIN cannot create, modify or delete another ADMIN', async () => {
    const create = await client.post(
      '/users',
      { name: 'Another Admin', email: 'admin3@example.test', password: 'Str0ngPassw0rd', role: 'ADMIN' },
      adminA.accessToken,
    );
    assert.equal(create.status, 403);
    assert.equal((await client.patch(`/users/${admin2A.id}`, { name: 'Renamed' }, adminA.accessToken)).status, 403);
    assert.equal((await client.delete(`/users/${admin2A.id}`, adminA.accessToken)).status, 403);
  });

  test('ADMIN can manage SALES users but cannot promote to OWNER', async () => {
    assert.equal((await client.patch(`/users/${sales2A.id}`, { role: 'MANAGER' }, adminA.accessToken)).status, 200);
    assert.equal((await client.patch(`/users/${sales2A.id}`, { role: 'OWNER' }, adminA.accessToken)).status, 400);
  });

  test('a user cannot change their own role', async () => {
    const res = await client.patch(`/users/${adminA.id}`, { role: 'MANAGER' }, adminA.accessToken);
    assert.equal(res.status, 400);
  });
});

describe('session invalidation', () => {
  test('a suspended user is locked out immediately, even with a live access token', async () => {
    const victim = await createMember(client, ownerA.accessToken, 'SALES');
    assert.equal((await client.get('/auth/me', victim.accessToken)).status, 200);

    const suspend = await client.patch(`/users/${victim.id}`, { isActive: false }, ownerA.accessToken);
    assert.equal(suspend.status, 200);

    assert.equal((await client.get('/auth/me', victim.accessToken)).status, 401);
    assert.equal((await client.post('/auth/refresh', { refreshToken: victim.refreshToken })).status, 401);
  });

  test('a role change applies on the next request', async () => {
    const member = await createMember(client, ownerA.accessToken, 'MANAGER');
    assert.equal((await client.get('/reports/sales', member.accessToken)).status, 200);

    await client.patch(`/users/${member.id}`, { role: 'EMPLOYEE' }, ownerA.accessToken);
    assert.equal((await client.get('/reports/sales', member.accessToken)).status, 403);
  });
});

describe('injection and input hardening', () => {
  test('operator objects in the login body never reach MongoDB', async () => {
    const res = await client.post('/auth/login', { email: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 400);
  });

  test('object-valued query parameters are rejected', async () => {
    const res = await client.get('/leads?status[$ne]=NEW', ownerA.accessToken);
    assert.equal(res.status, 400);
  });

  test('malformed ids return 400/404, not 500', async () => {
    const res = await client.get('/leads/not-an-id', ownerA.accessToken);
    assert.ok([400, 404].includes(res.status), `got ${res.status}`);
  });

  test('malformed JSON body returns 400 without internals', async () => {
    const res = await client.raw('POST', '/auth/login', { rawBody: '{"email":' });
    assert.equal(res.status, 400);
    assert.equal(res.body.stack, undefined);
  });
});
