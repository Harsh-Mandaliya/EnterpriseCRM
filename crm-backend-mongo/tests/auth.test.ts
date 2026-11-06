import { api, PASSWORD, registerCompany, startTestServer, uniqueEmail, type TestContext } from './setup';

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

let ctx: TestContext;
let client: ReturnType<typeof api>;

before(async () => {
  ctx = await startTestServer();
  client = api(ctx.baseUrl);
});

after(async () => {
  await ctx.close();
});

describe('registration and login', () => {
  test('register creates a company with a company code and returns tokens', async () => {
    const owner = await registerCompany(client, 'Shree Ganesh Traders');
    const me = await client.get('/auth/me', owner.accessToken);

    assert.equal(me.status, 200);
    assert.equal(me.body.role, 'OWNER');
    assert.equal(me.body.company.name, 'Shree Ganesh Traders');
    assert.match(me.body.company.slug, /^shree-ganesh-traders/);
    assert.equal(me.body.branding.resolved.preset, 'classic');
    assert.equal(me.body.passwordHash, undefined);
  });

  test('duplicate e-mail is rejected', async () => {
    const owner = await registerCompany(client);
    const res = await client.post('/auth/register', {
      companyName: 'Other Co',
      ownerName: 'Someone',
      email: owner.email,
      password: PASSWORD,
    });
    assert.equal(res.status, 409);
  });

  test('weak password is rejected by validation', async () => {
    const res = await client.post('/auth/register', {
      companyName: 'Weak Co',
      ownerName: 'Weak',
      email: uniqueEmail(),
      password: 'short',
    });
    assert.equal(res.status, 400);
  });

  test('wrong password and unknown e-mail give the same generic error', async () => {
    const owner = await registerCompany(client);
    const wrong = await client.post('/auth/login', { email: owner.email, password: 'Wrong1234' });
    const unknown = await client.post('/auth/login', { email: uniqueEmail(), password: 'Wrong1234' });

    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.error, unknown.body.error);
  });

  test('protected routes require a valid access token', async () => {
    assert.equal((await client.get('/auth/me')).status, 401);
    assert.equal((await client.get('/auth/me', 'not-a-jwt')).status, 401);
  });
});

describe('refresh token lifecycle', () => {
  test('refresh rotates the token and the old one stops working', async () => {
    const owner = await registerCompany(client);

    const first = await client.post('/auth/refresh', { refreshToken: owner.refreshToken });
    assert.equal(first.status, 200);
    assert.notEqual(first.body.refreshToken, owner.refreshToken);

    const replay = await client.post('/auth/refresh', { refreshToken: owner.refreshToken });
    assert.equal(replay.status, 401);
  });

  test('replaying a rotated token revokes the whole session family', async () => {
    const owner = await registerCompany(client);

    const rotated = await client.post('/auth/refresh', { refreshToken: owner.refreshToken });
    assert.equal(rotated.status, 200);

    // Attacker replays the stolen, already-rotated token...
    await client.post('/auth/refresh', { refreshToken: owner.refreshToken });

    // ...so the legitimate newer token is revoked too.
    const legit = await client.post('/auth/refresh', { refreshToken: rotated.body.refreshToken });
    assert.equal(legit.status, 401);
  });

  test('logout revokes the refresh token', async () => {
    const owner = await registerCompany(client);
    assert.equal((await client.post('/auth/logout', { refreshToken: owner.refreshToken })).status, 204);
    assert.equal((await client.post('/auth/refresh', { refreshToken: owner.refreshToken })).status, 401);
  });

  test('logout-all ends every session of the user', async () => {
    const owner = await registerCompany(client);
    const second = await client.post('/auth/login', { email: owner.email, password: PASSWORD });

    assert.equal((await client.post('/auth/logout-all', {}, owner.accessToken)).status, 204);
    assert.equal((await client.post('/auth/refresh', { refreshToken: owner.refreshToken })).status, 401);
    assert.equal((await client.post('/auth/refresh', { refreshToken: second.body.refreshToken })).status, 401);
  });
});

describe('password reset', () => {
  test('reset token is single-use and ends existing sessions', async () => {
    const owner = await registerCompany(client);

    const forgot = await client.post('/auth/forgot-password', { email: owner.email });
    assert.equal(forgot.status, 202);

    // The raw token is only ever delivered out of band; tests read it
    // through the service, exactly as the mailer integration would.
    const { requestPasswordReset } = await import('@/modules/auth/auth.service');
    const token = await requestPasswordReset(owner.email);
    assert.ok(token);

    const newPassword = 'N3wPassword!';
    const reset = await client.post('/auth/reset-password', { token, password: newPassword });
    assert.equal(reset.status, 200);

    const again = await client.post('/auth/reset-password', { token, password: 'An0therPass' });
    assert.equal(again.status, 400);

    assert.equal((await client.post('/auth/refresh', { refreshToken: owner.refreshToken })).status, 401);
    assert.equal((await client.post('/auth/login', { email: owner.email, password: PASSWORD })).status, 401);
    assert.equal((await client.post('/auth/login', { email: owner.email, password: newPassword })).status, 200);
  });

  test('forgot-password does not reveal unknown e-mails', async () => {
    const res = await client.post('/auth/forgot-password', { email: uniqueEmail('ghost') });
    assert.equal(res.status, 202);
  });

  test('a forged reset token is rejected', async () => {
    const res = await client.post('/auth/reset-password', {
      token: 'x'.repeat(43),
      password: 'N3wPassword!',
    });
    assert.equal(res.status, 400);
  });
});

describe('google sign-in', () => {
  test('answers 503 when GOOGLE_CLIENT_ID is not configured', async () => {
    const res = await client.post('/auth/google', { credential: 'fake-token' });
    assert.equal(res.status, 503);
  });
});

describe('upgrade safety', () => {
  test('a legacy refresh-token index is dropped and failed sign-ups leave nothing behind', async () => {
    const mongoose = (await import('mongoose')).default;
    const { dropLegacyIndexes } = await import('@/config/database');
    const tokens = mongoose.connection.collection('refreshtokens');

    // Reproduce a database that was never migrated from the old schema
    // (this suite's earlier sessions are no longer needed).
    await tokens.deleteMany({});
    await tokens.createIndex({ token: 1 }, { unique: true, name: 'token_1' });
    await registerCompany(client, 'First After Upgrade');

    const email = uniqueEmail('blocked');
    const blocked = await client.post('/auth/register', {
      companyName: 'Blocked Co',
      ownerName: 'Blocked Owner',
      email,
      password: PASSWORD,
    });
    assert.equal(blocked.status, 409, 'old index rejects the second token');

    // The failed sign-up was rolled back completely.
    assert.equal(await mongoose.connection.collection('users').countDocuments({ email }), 0);
    assert.equal(await mongoose.connection.collection('companies').countDocuments({ name: 'Blocked Co' }), 0);

    // Startup drops the legacy index; sign-up works again.
    await dropLegacyIndexes();
    const names = (await tokens.indexes()).map(i => i.name);
    assert.ok(!names.includes('token_1'));

    const retry = await client.post('/auth/register', {
      companyName: 'Blocked Co',
      ownerName: 'Blocked Owner',
      email,
      password: PASSWORD,
    });
    assert.equal(retry.status, 201, JSON.stringify(retry.body));
  });
});
