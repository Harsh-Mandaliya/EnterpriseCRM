import { api, createMember, registerCompany, startTestServer, type TestContext } from './setup';

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

/* v1.4.2 — task assignment (person or general team task) and the
   completion record (who completed it and when). */

let ctx: TestContext;
let client: ReturnType<typeof api>;
let owner: Awaited<ReturnType<typeof registerCompany>>;
let rival: Awaited<ReturnType<typeof registerCompany>>;
let manager: Awaited<ReturnType<typeof createMember>>;
let repA: Awaited<ReturnType<typeof createMember>>;
let repB: Awaited<ReturnType<typeof createMember>>;
let rivalRep: Awaited<ReturnType<typeof createMember>>;

const list = (b: unknown) => (Array.isArray(b) ? b : ((b as { items?: unknown[] }).items ?? [])) as Record<string, any>[];

before(async () => {
  ctx = await startTestServer();
  client = api(ctx.baseUrl);
  owner = await registerCompany(client, 'Task Co');
  rival = await registerCompany(client, 'Rival Task Co');
  manager = await createMember(client, owner.accessToken, 'MANAGER');
  repA = await createMember(client, owner.accessToken, 'SALES');
  repB = await createMember(client, owner.accessToken, 'SALES');
  rivalRep = await createMember(client, rival.accessToken, 'SALES');
  await client.post('/teams', { name: 'T', managerId: manager.id, memberIds: [repA.id] }, owner.accessToken);
});

after(async () => {
  await ctx.close();
});

describe('assigning tasks', () => {
  test('owner assigns to a person: assignee name returned and notified', async () => {
    const res = await client.post('/activities', { type: 'CALL', summary: 'Call Acme', assignedToId: repA.id }, owner.accessToken);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.assignedToId, repA.id);
    assert.equal(res.body.assignedTo.id, repA.id);
    assert.ok(res.body.assignedTo.name);
    const inbox = list((await client.get('/notifications', repA.accessToken)).body);
    assert.ok(inbox.some(n => n.title === 'New task assigned to you'));
  });

  test('a general team task (null) is visible to everyone in the company, not to others', async () => {
    const res = await client.post('/activities', { type: 'TASK', summary: 'Restock samples', assignedToId: null }, manager.accessToken);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.assignedToId, null);
    assert.equal(res.body.assignedTo, null);
    for (const who of [repA, repB]) {
      assert.ok(list((await client.get('/activities', who.accessToken)).body).some(t => t.id === res.body.id));
    }
    assert.ok(!list((await client.get('/activities', rival.accessToken)).body).some(t => t.id === res.body.id));
  });

  test('reps cannot assign to colleagues or create general tasks; they can create their own', async () => {
    assert.equal((await client.post('/activities', { type: 'TASK', summary: 'x', assignedToId: repB.id }, repA.accessToken)).status, 403);
    assert.equal((await client.post('/activities', { type: 'TASK', summary: 'x', assignedToId: null }, repA.accessToken)).status, 403);
    const own = await client.post('/activities', { type: 'TASK', summary: 'Mine' }, repA.accessToken);
    assert.equal(own.status, 201);
    assert.equal(own.body.assignedToId, repA.id);
  });

  test('cannot assign to a user or link a customer from another company', async () => {
    assert.equal((await client.post('/activities', { type: 'TASK', summary: 'x', assignedToId: rivalRep.id }, owner.accessToken)).status, 400);
    const rivalCustomer = (await client.post('/customers', { name: 'Rival customer' }, rival.accessToken)).body.id;
    assert.equal((await client.post('/activities', { type: 'TASK', summary: 'x', customerId: rivalCustomer }, owner.accessToken)).status, 400);
  });

  test('reassign: manager can, rep cannot; new assignee is notified', async () => {
    const task = (await client.post('/activities', { type: 'TASK', summary: 'Prepare quote', assignedToId: null }, manager.accessToken)).body;
    assert.equal((await client.patch(`/activities/${task.id}/assign`, { assignedToId: repA.id }, repA.accessToken)).status, 403);
    const res = await client.patch(`/activities/${task.id}/assign`, { assignedToId: repA.id }, manager.accessToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.assignedTo.id, repA.id);
    const inbox = list((await client.get('/notifications', repA.accessToken)).body);
    assert.ok(inbox.some(n => n.title === 'Task assigned to you' && n.message === 'Prepare quote'));
    const back = await client.patch(`/activities/${task.id}/assign`, { assignedToId: null }, manager.accessToken);
    assert.equal(back.body.assignedToId, null);
    assert.equal((await client.patch(`/activities/${task.id}/assign`, { assignedToId: rivalRep.id }, manager.accessToken)).status, 400);
  });
});

describe('who completed a task and when', () => {
  test('completion records the person and the time, and tells the creator', async () => {
    const task = (await client.post('/activities', { type: 'TASK', summary: 'Pack samples for Acme', assignedToId: null }, owner.accessToken)).body;
    const before = Date.now();
    const done = await client.patch(`/activities/${task.id}/complete`, {}, repB.accessToken);
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.equal(done.body.status, 'COMPLETED');
    assert.equal(done.body.completedBy.id, repB.id);
    assert.ok(done.body.completedBy.name);
    assert.ok(new Date(done.body.completedAt).getTime() >= before - 1000);

    const inbox = list((await client.get('/notifications', owner.accessToken)).body);
    assert.ok(inbox.some(n => n.title === 'Task completed' && n.message.includes('Pack samples for Acme')), JSON.stringify(inbox.map(n => n.title)));
    assert.equal((await client.patch(`/activities/${task.id}/complete`, {}, repA.accessToken)).status, 400, 'cannot complete twice');
    assert.equal((await client.patch(`/activities/${task.id}/assign`, { assignedToId: repA.id }, owner.accessToken)).status, 400, 'completed tasks stay as they are');
  });

  test('a rep still cannot complete a colleague\'s personal task', async () => {
    const task = (await client.post('/activities', { type: 'TASK', summary: 'Private', assignedToId: repB.id }, owner.accessToken)).body;
    assert.equal((await client.patch(`/activities/${task.id}/complete`, {}, repA.accessToken)).status, 404);
  });
});
