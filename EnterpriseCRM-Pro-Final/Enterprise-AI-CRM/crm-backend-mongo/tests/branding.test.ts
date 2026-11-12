import { api, createMember, registerCompany, startTestServer, type TestContext } from './setup';

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

let ctx: TestContext;
let client: ReturnType<typeof api>;
let owner: Awaited<ReturnType<typeof registerCompany>>;
let otherOwner: Awaited<ReturnType<typeof registerCompany>>;
let sales: Awaited<ReturnType<typeof createMember>>;
let manager: Awaited<ReturnType<typeof createMember>>;

before(async () => {
  ctx = await startTestServer();
  client = api(ctx.baseUrl);
  owner = await registerCompany(client, 'Brand Co');
  otherOwner = await registerCompany(client, 'Other Brand');
  sales = await createMember(client, owner.accessToken, 'SALES');
  manager = await createMember(client, owner.accessToken, 'MANAGER');
});

after(async () => {
  await ctx.close();
});

describe('company branding', () => {
  test('defaults to the classic preset with system colour mode', async () => {
    const res = await client.get('/company/branding', sales.accessToken);
    assert.equal(res.status, 200);
    assert.equal(res.body.resolved.preset, 'classic');
    assert.equal(res.body.resolved.colorMode, 'system');
    assert.equal(res.body.resolved.displayName, 'Brand Co');
    assert.equal(res.body.canEdit, false);
  });

  test('OWNER can change preset, colours, logo and display name', async () => {
    const res = await client.patch(
      '/company/branding',
      {
        preset: 'emerald',
        primaryColor: '#0F766E',
        accentColor: '#F59E0B',
        displayName: 'Brand Co CRM',
        logoUrl: 'https://cdn.example.com/logo.png',
        cornerStyle: 'pill',
        density: 'compact',
      },
      owner.accessToken,
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.resolved.preset, 'emerald');
    assert.equal(res.body.resolved.primaryColor, '#0F766E');
    assert.equal(res.body.resolved.displayName, 'Brand Co CRM');
    assert.equal(res.body.canEdit, true);

    const seenBySales = await client.get('/company/branding', sales.accessToken);
    assert.equal(seenBySales.body.resolved.preset, 'emerald');
    assert.equal(seenBySales.body.resolved.logoUrl, 'https://cdn.example.com/logo.png');
  });

  test('branding of one company never leaks into another', async () => {
    const res = await client.get('/company/branding', otherOwner.accessToken);
    assert.equal(res.body.resolved.preset, 'classic');
    assert.equal(res.body.resolved.displayName, 'Other Brand');
  });

  test('non-admin roles cannot change branding', async () => {
    assert.equal((await client.patch('/company/branding', { preset: 'royal' }, sales.accessToken)).status, 403);
    assert.equal((await client.patch('/company/branding', { preset: 'royal' }, manager.accessToken)).status, 403);
  });

  test('invalid colours, presets and insecure logo URLs are rejected', async () => {
    assert.equal((await client.patch('/company/branding', { primaryColor: 'red' }, owner.accessToken)).status, 400);
    assert.equal((await client.patch('/company/branding', { preset: 'neon' }, owner.accessToken)).status, 400);
    assert.equal(
      (await client.patch('/company/branding', { logoUrl: 'http://example.com/a.png' }, owner.accessToken)).status,
      400,
    );
    assert.equal(
      (await client.patch('/company/branding', { logoUrl: 'javascript:alert(1)' }, owner.accessToken)).status,
      400,
    );
    assert.equal((await client.patch('/company/branding', { unknownField: true }, owner.accessToken)).status, 400);
  });
});

describe('role-based themes', () => {
  test('a role preset overrides the company preset for that role only', async () => {
    const res = await client.patch('/company/branding', { roleThemes: { SALES: 'sunset' } }, owner.accessToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));

    const salesView = await client.get('/company/branding', sales.accessToken);
    assert.equal(salesView.body.resolved.preset, 'sunset');
    assert.equal(salesView.body.resolved.source, 'role');
    // Company colour overrides only belong to the company preset.
    assert.equal(salesView.body.resolved.primaryColor, null);

    const managerView = await client.get('/company/branding', manager.accessToken);
    assert.equal(managerView.body.resolved.preset, 'emerald');
    assert.equal(managerView.body.resolved.source, 'company');
  });

  test('a role preset can be cleared with null', async () => {
    await client.patch('/company/branding', { roleThemes: { SALES: null } }, owner.accessToken);
    const salesView = await client.get('/company/branding', sales.accessToken);
    assert.equal(salesView.body.resolved.preset, 'emerald');
  });
});

describe('personal preferences', () => {
  test('any user can choose their own colour mode and preset when allowed', async () => {
    const res = await client.patch('/company/preferences', { colorMode: 'dark', themePreset: 'royal' }, sales.accessToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.resolved.colorMode, 'dark');
    assert.equal(res.body.resolved.preset, 'royal');
    assert.equal(res.body.resolved.source, 'user');

    // Does not affect colleagues.
    const managerView = await client.get('/company/branding', manager.accessToken);
    assert.equal(managerView.body.resolved.preset, 'emerald');
  });

  test('when the company disables personal themes, the company look wins', async () => {
    await client.patch('/company/branding', { allowUserThemes: false }, owner.accessToken);

    const salesView = await client.get('/company/branding', sales.accessToken);
    assert.equal(salesView.body.resolved.preset, 'emerald');
    // Colour mode stays personal.
    assert.equal(salesView.body.resolved.colorMode, 'dark');

    const attempt = await client.patch('/company/preferences', { themePreset: 'graphite' }, sales.accessToken);
    assert.equal(attempt.status, 403);
  });
});

describe('company profile and pre-login lookup', () => {
  test('only the OWNER can change the company profile', async () => {
    assert.equal((await client.patch('/company/profile', { currency: 'USD' }, sales.accessToken)).status, 403);
    const res = await client.patch('/company/profile', { slug: 'brand-co', currency: 'INR', timezone: 'Asia/Kolkata' }, owner.accessToken);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.company.slug, 'brand-co');
  });

  test('company codes are unique', async () => {
    const res = await client.patch('/company/profile', { slug: 'brand-co' }, otherOwner.accessToken);
    assert.equal(res.status, 409);
  });

  test('public branding by company code exposes only presentation fields', async () => {
    const res = await client.get('/company/public/brand-co');
    assert.equal(res.status, 200);
    assert.equal(res.body.displayName, 'Brand Co CRM');
    assert.equal(res.body.preset, 'emerald');
    assert.equal(res.body.id, undefined);
    assert.equal(res.body.roleThemes, undefined);
    assert.equal(res.body.allowUserThemes, undefined);
  });

  test('unknown company code returns 404', async () => {
    assert.equal((await client.get('/company/public/does-not-exist')).status, 404);
  });
});
