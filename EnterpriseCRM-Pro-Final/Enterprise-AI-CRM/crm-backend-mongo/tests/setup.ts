/**
 * Test bootstrap — import this FIRST in every test file.
 *
 * Each test file runs in its own process (node --test) against its own
 * throw-away database on TEST_MONGODB_URI (default: local mongod). The
 * database is dropped when the file finishes. Never point this at a
 * production cluster.
 */
import { randomBytes } from 'crypto';
import type { AddressInfo } from 'net';
import type { Server } from 'http';

const baseUri = (process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017').replace(/\/+$/, '');
const dbName = `crm_test_${randomBytes(4).toString('hex')}`;

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = `${baseUri}/${dbName}`;
process.env.JWT_ACCESS_SECRET = randomBytes(32).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(32).toString('hex');
process.env.CORS_ORIGIN = 'http://localhost:8081';
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX ?? '30';
process.env.API_RATE_LIMIT_MAX = '10000';
// Empty (not deleted) so dotenv cannot fill it in from a local .env.
process.env.GOOGLE_CLIENT_ID = '';

export interface TestContext {
  baseUrl: string;
  close: () => Promise<void>;
}

export async function startTestServer(): Promise<TestContext> {
  const mongoose = (await import('mongoose')).default;
  const { app } = await import('@/app');

  await mongoose.connect(process.env.MONGODB_URI!);
  // Build unique indexes before tests rely on them.
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));

  const server: Server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}/api/v1`,
    close: async () => {
      await new Promise<void>(resolve => server.close(() => resolve()));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
}

/* ============================================================
   HTTP HELPERS
============================================================ */

export interface ApiResponse<T = Record<string, unknown>> {
  status: number;
  body: T;
}

export function api(baseUrl: string) {
  async function request<T = Record<string, any>>(
    method: string,
    path: string,
    options: { token?: string; body?: unknown; rawBody?: string } = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body:
        options.rawBody ??
        (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });

    const text = await res.text();
    return { status: res.status, body: (text ? JSON.parse(text) : {}) as T };
  }

  return {
    get: <T = Record<string, any>>(path: string, token?: string) =>
      request<T>('GET', path, { token }),
    post: <T = Record<string, any>>(path: string, body?: unknown, token?: string) =>
      request<T>('POST', path, { body, token }),
    patch: <T = Record<string, any>>(path: string, body?: unknown, token?: string) =>
      request<T>('PATCH', path, { body, token }),
    delete: <T = Record<string, any>>(path: string, token?: string) =>
      request<T>('DELETE', path, { token }),
    raw: request,
  };
}

let counter = 0;

export function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@example.test`;
}

export const PASSWORD = 'Str0ngPassw0rd';

/**
 * Registers a company and returns its owner's tokens.
 */
export async function registerCompany(
  client: ReturnType<typeof api>,
  companyName = 'Acme Traders',
) {
  const email = uniqueEmail('owner');
  const res = await client.post('/auth/register', {
    companyName,
    ownerName: 'Olivia Owner',
    email,
    password: PASSWORD,
  });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { email, accessToken: res.body.accessToken as string, refreshToken: res.body.refreshToken as string };
}

/**
 * Creates a teammate through the API and signs them in.
 */
export async function createMember(
  client: ReturnType<typeof api>,
  ownerToken: string,
  role: 'ADMIN' | 'MANAGER' | 'SALES' | 'EMPLOYEE',
) {
  const email = uniqueEmail(role.toLowerCase());
  const created = await client.post(
    '/users',
    { name: `${role} Person`, email, password: PASSWORD, role },
    ownerToken,
  );
  if (created.status !== 201) {
    throw new Error(`create user failed: ${created.status} ${JSON.stringify(created.body)}`);
  }
  const login = await client.post('/auth/login', { email, password: PASSWORD });
  if (login.status !== 200) {
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }
  return {
    id: created.body.id as string,
    email,
    accessToken: login.body.accessToken as string,
    refreshToken: login.body.refreshToken as string,
  };
}
