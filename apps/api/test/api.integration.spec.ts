import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { Connection } from 'mongoose';
import request, { Response } from 'supertest';
import { IsolatedMongo, startIsolatedMongo } from './mongo-harness';
const EMAIL = 'demo-fixture@example.test';
const PASSWORD = 'Synthetic-Only-Test-Password-496!';
const SECRET = 'synthetic-api-integration-jwt-secret-at-least-32-bytes';
const ORIGIN = 'http://localhost:4200';
const CSRF = { Origin: ORIGIN, 'X-CSRF-Protection': '1' };
interface FixtureUser { _id: string; email: string; passwordHash: string; createdAt: Date; updatedAt: Date; }
function cookies(response: Response): string[] {
  const value: unknown = response.headers['set-cookie'];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : [];
}
function refreshCookie(response: Response): string {
  const value = cookies(response).find(cookie => cookie.startsWith('refresh_token='));
  expect(value).toBeDefined(); return value!.split(';')[0];
}
function safeBody(response: Response): void {
  expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|refreshTokenHash|previousTokenHashes|tokenFamilyId|"password"/);
}
describe('Phase 1 real MongoDB HTTP integration and security', () => {
  let mongo: IsolatedMongo | undefined;
  let app: INestApplication | undefined;
  const userId = randomUUID();
  const auditEvents: unknown[] = [];
  const savedEnvironment = { ...process.env };
  beforeAll(async () => {
    try {
      mongo = await startIsolatedMongo();
      Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: mongo.uri, JWT_SECRET: SECRET,
        JWT_ISSUER: 'product-api', JWT_AUDIENCE: 'product-client', CORS_ORIGINS: ORIGIN,
        ACCESS_TOKEN_TTL_SECONDS: '900', REFRESH_TOKEN_TTL_SECONDS: '604800', COOKIE_SAME_SITE: 'lax',
        LOGIN_RATE_LIMIT: '1000', REFRESH_RATE_LIMIT: '1000', RATE_WINDOW_MS: '60000' });
      // ConfigModule validates during module evaluation, so import after setting isolated env.
      const { AppModule } = await import('../src/app.module');
      const { configureApplication } = await import('../src/bootstrap');
      const { ScryptPasswordHasher } = await import('../src/modules/auth/infrastructure/security/hashing/scrypt-password.hasher');
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
      app = moduleRef.createNestApplication({ logger: false, bodyParser: false });
      configureApplication(app, { auditSink: (event: unknown) => { auditEvents.push(event); } });
      await app.init();
      await Promise.all(Object.values(app.get<Connection>(getConnectionToken()).models).map(model => model.init()));
      const passwordHash = await new ScryptPasswordHasher().hash(PASSWORD);
      await mongo.connection.collection<FixtureUser>('users').insertOne({ _id: userId, email: EMAIL, passwordHash, createdAt: new Date(), updatedAt: new Date() });
    } catch (error) {
      await app?.close(); await mongo?.stop(); app = undefined; mongo = undefined; throw error;
    }
  }, 30000);
  afterAll(async () => {
    try { await app?.close(); } finally {
      await mongo?.stop();
      for (const key of Object.keys(process.env)) if (!(key in savedEnvironment)) delete process.env[key];
      Object.assign(process.env, savedEnvironment);
    }
  });
  beforeEach(async () => {
    await mongo!.connection.collection('products').deleteMany({});
    await mongo!.connection.collection('auth_sessions').deleteMany({}); auditEvents.length = 0;
  });
  const api = () => request(app!.getHttpServer());
  const login = () => api().post('/auth/login').set(CSRF).send({ email: EMAIL, password: PASSWORD });
  const refresh = (cookie: string) => api().post('/auth/refresh').set(CSRF).set('Cookie', cookie).send({});
  const create = (token: string, data: Record<string, unknown> = { name: 'Organic seed', priceMinor: 1299, stock: 3 }) => api().post('/products').auth(token, { type: 'bearer' }).send(data);

  it('logs in, protects the opaque refresh cookie and exposes safe current-user data', async () => {
    const response = await login().expect(200);
    expect(response.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900 });
    const header = cookies(response).join(';');
    for (const property of ['HttpOnly', 'Path=/auth', 'SameSite=Lax']) expect(header).toContain(property);
    const raw = refreshCookie(response).split('=')[1]; expect(raw.length).toBeGreaterThanOrEqual(43);
    expect(JSON.stringify(await mongo!.connection.collection('auth_sessions').findOne({}))).not.toContain(raw);
    safeBody(response);
    const current = await api().get('/auth/me').auth(response.body.accessToken, { type: 'bearer' }).expect(200);
    expect(current.body).toMatchObject({ id: userId, email: EMAIL });
    expect(Object.keys(current.body).sort()).toEqual(['createdAt', 'email', 'id', 'updatedAt']); safeBody(current);
  });
  it('returns the same generic response for absent user and wrong password', async () => {
    const wrong = await api().post('/auth/login').set(CSRF).send({ email: EMAIL, password: 'Wrong-Synthetic-Password-1!' }).expect(401);
    const missing = await api().post('/auth/login').set(CSRF).send({ email: 'missing@example.test', password: PASSWORD }).expect(401);
    expect(wrong.body.message).toEqual(missing.body.message); safeBody(wrong); safeBody(missing);
  });
  it('does not expose registration', async () => {
    const response = await api().post('/auth/register').set(CSRF).send({ email: EMAIL, password: PASSWORD });
    expect([401, 404]).toContain(response.status);
  });
  it('rejects absent, invalid, expired, wrong-audience and wrong-algorithm JWTs', async () => {
    await api().get('/products').expect(401); await api().get('/products').auth('invalid', { type: 'bearer' }).expect(401);
    const jwt = new JwtService(); const options = { secret: SECRET, issuer: 'product-api', audience: 'product-client', algorithm: 'HS256' as const };
    const tokens = [jwt.sign({sub:userId},options), jwt.sign({ sub: userId }, { ...options, expiresIn: -1 }), jwt.sign({ sub: userId }, { ...options, audience: 'wrong', expiresIn: 60 }), jwt.sign({ sub: userId }, { ...options, algorithm: 'HS512', expiresIn: 60 })];
    for (const token of tokens) await api().get('/products').auth(token, { type: 'bearer' }).expect(401);
  });
  it('protects every product endpoint and current-user endpoint', async () => {
    const id = '0123456789abcdef01234567';
    await api().get('/products').expect(401); await api().get(`/products/${id}`).expect(401);
    await api().post('/products').send({}).expect(401); await api().patch(`/products/${id}`).send({}).expect(401);
    await api().delete(`/products/${id}`).expect(401); await api().get('/auth/me').expect(401);
  });
  it('strictly validates the login DTO', async () => {
    for (const data of [{ email: 'invalid', password: PASSWORD }, { email: EMAIL, password: PASSWORD, administrator: true }, { email: EMAIL, password: null }]) await api().post('/auth/login').set(CSRF).send(data).expect(400);
  });
  it('requires the exact allowlisted Origin and CSRF header, independently of cookie presence', async () => {
    await api().post('/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(403);
    await api().post('/auth/login').set('Origin', ORIGIN).send({ email: EMAIL, password: PASSWORD }).expect(403);
    await api().post('/auth/login').set({ Origin: 'https://attacker.example', 'X-CSRF-Protection': '1' }).send({ email: EMAIL, password: PASSWORD }).expect(403);
    const cookie = refreshCookie(await login().expect(200));
    await api().post('/auth/refresh').set('Cookie', cookie).send({}).expect(403);
    await api().post('/auth/logout').set('Cookie', cookie).send({}).expect(403); await refresh(cookie).expect(200);
  });
  it('rejects unexpected bodies on cookie-only refresh and logout operations', async () => {
    const cookie=refreshCookie(await login().expect(200));
    for (const path of ['/auth/refresh','/auth/logout']) {
      await api().post(path).set(CSRF).set('Cookie',cookie).send({unexpected:true}).expect(400);
      await api().post(path).set(CSRF).set('Cookie',cookie).send([]).expect(400);
    }
    await refresh(cookie).expect(200);
  });
  it('rotates refresh tokens without extending absolute family expiration', async () => {
    const old = refreshCookie(await login().expect(200));
    const before = await mongo!.connection.collection('auth_sessions').findOne({});
    const rotated = await refresh(old).expect(200); const next = refreshCookie(rotated);
    expect(next).not.toBe(old); safeBody(rotated);
    const after = await mongo!.connection.collection('auth_sessions').findOne({}); expect(after!.expiresAt).toEqual(before!.expiresAt);
    expect(JSON.stringify(after)).not.toContain(next.split('=')[1]);
  });
  it('detects replay and revokes the affected replacement session', async () => {
    const original = refreshCookie(await login().expect(200)); const replacement = refreshCookie(await refresh(original).expect(200));
    await refresh(original).expect(401); await refresh(replacement).expect(401);
    expect(await mongo!.connection.collection('auth_sessions').countDocuments({ revokedAt: { $ne: null } })).toBe(1);
  });
  it('atomically permits at most one concurrent rotation and revokes replayed family', async () => {
    const original = refreshCookie(await login().expect(200)); const responses = await Promise.all([refresh(original), refresh(original)]);
    expect(responses.filter(response => response.status === 200).length).toBeLessThanOrEqual(1);
    expect(responses.every(response => [200, 401].includes(response.status))).toBe(true); expect(responses.some(response => response.status === 401)).toBe(true);
    const winner = responses.find(response => response.status === 200); if (winner) await refresh(refreshCookie(winner)).expect(401);
    expect((await mongo!.connection.collection('auth_sessions').findOne({}))!.revokedAt).not.toBeNull();
  });
  it('enforces expired refresh status before asynchronous TTL deletion', async () => {
    const cookie = refreshCookie(await login().expect(200));
    await mongo!.connection.collection('auth_sessions').updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } }); await refresh(cookie).expect(401);
  });
  it('rejects revoked refresh sessions and missing cookies', async () => {
    const cookie = refreshCookie(await login().expect(200));
    await mongo!.connection.collection('auth_sessions').updateMany({}, { $set: { revokedAt: new Date() } }); await refresh(cookie).expect(401);
    await api().post('/auth/refresh').set(CSRF).send({}).expect(401);
  });
  it('logout clears cookies, revokes refresh, and is idempotent without cookie', async () => {
    const cookie = refreshCookie(await login().expect(200));
    const out = await api().post('/auth/logout').set(CSRF).set('Cookie', cookie).send({}).expect(204);
    expect(cookies(out).join(';')).toContain('refresh_token=;'); await refresh(cookie).expect(401);
    await api().post('/auth/logout').set(CSRF).send({}).expect(204);
  });
  it('implements complete protected CRUD and maps persistence internals out of responses', async () => {
    const token = (await login().expect(200)).body.accessToken as string; const made = await create(token).expect(201);
    expect(made.body).toMatchObject({ name: 'Organic seed', priceMinor: 1299, stock: 3 }); expect(made.body.id).toMatch(/^[a-f\d]{24}$/i);
    expect(made.body).not.toHaveProperty('_id'); expect(made.body).not.toHaveProperty('__v'); expect(new Date(made.body.createdAt).toISOString()).toBe(made.body.createdAt);
    const id = made.body.id as string; await api().get(`/products/${id}`).auth(token, { type: 'bearer' }).expect(200);
    const changed = await api().patch(`/products/${id}`).auth(token, { type: 'bearer' }).send({ priceMinor: 1599, stock: 0 }).expect(200);
    expect(changed.body).toMatchObject({ id, name: 'Organic seed', priceMinor: 1599, stock: 0 });
    await api().delete(`/products/${id}`).auth(token, { type: 'bearer' }).expect(204); await api().get(`/products/${id}`).auth(token, { type: 'bearer' }).expect(404);
    await api().delete(`/products/${id}`).auth(token, { type: 'bearer' }).expect(404);
  });
  it('paginates with category/search filters, allowlisted sorting and stable tie-breaks', async () => {
    const token = (await login().expect(200)).body.accessToken as string; const now = new Date();
    await mongo!.connection.collection('products').insertMany([
      { name: 'Seed alpha', priceMinor: 500, stock: 1, category: 'Seeds', createdAt: now, updatedAt: now },
      { name: 'Seed beta', priceMinor: 100, stock: 1, category: 'Seeds', createdAt: now, updatedAt: now },
      { name: 'Other', priceMinor: 300, stock: 1, category: 'Tools', createdAt: now, updatedAt: now }]);
    const query = { pageSize: 1, search: 'Seed', category: 'Seeds', sortBy: 'priceMinor', sortDirection: 'asc' };
    const first = await api().get('/products').auth(token, { type: 'bearer' }).query({ ...query, page: 1 }).expect(200);
    expect(first.body).toMatchObject({ total: 2, page: 1, pageSize: 1, totalPages: 2 }); expect(first.body.items).toHaveLength(1); expect(first.body.items[0].name).toBe('Seed beta');
    const second = await api().get('/products').auth(token, { type: 'bearer' }).query({ ...query, page: 2 }).expect(200); expect(second.body.items[0].name).toBe('Seed alpha');
    const tieQuery = { sortBy: 'createdAt', sortDirection: 'asc' };
    const a = await api().get('/products').auth(token, { type: 'bearer' }).query(tieQuery).expect(200); const b = await api().get('/products').auth(token, { type: 'bearer' }).query(tieQuery).expect(200);
    expect(a.body.items.map((item: { id: string }) => item.id)).toEqual(b.body.items.map((item: { id: string }) => item.id));
  });
  it('escapes search regular-expression metacharacters', async () => {
    const token = (await login().expect(200)).body.accessToken as string;
    await create(token, { name: 'Seed.*literal', priceMinor: 1, stock: 1 }).expect(201); await create(token, { name: 'Seed other', priceMinor: 1, stock: 1 }).expect(201);
    const found = await api().get('/products').auth(token, { type: 'bearer' }).query({ search: '.*' }).expect(200); expect(found.body.total).toBe(1); expect(found.body.items[0].name).toBe('Seed.*literal');
  });
  it('rejects invalid money/stock, unknown properties, nulls and empty PATCH', async () => {
    const token = (await login().expect(200)).body.accessToken as string;
    for (const data of [{ name: '', priceMinor: 0, stock: 0 }, { name: 'Seed', priceMinor: -1, stock: 0 }, { name: 'Seed', priceMinor: 1.5, stock: 0 },
      { name: 'Seed', priceMinor: Number.MAX_SAFE_INTEGER + 1, stock: 0 }, { name: 'Seed', priceMinor: 1, stock: -1 }, { name: 'Seed', priceMinor: 1, stock: 1.2 },
      { name: 'Seed', priceMinor: '1', stock: 0 }, { name: 'Seed', priceMinor: 1, stock: 0, surprise: true }, { name: 'Seed', priceMinor: 1, stock: 0, category: null }]) await create(token, data).expect(400);
    const id = (await create(token).expect(201)).body.id as string;
    for (const data of [{ stock: null }, {}, { description: null }]) await api().patch(`/products/${id}`).auth(token, { type: 'bearer' }).send(data).expect(400);
  });
  it('handles invalid/missing IDs and pagination/filter validation with safe error responses', async () => {
    const token = (await login().expect(200)).body.accessToken as string;
    await api().get('/products/not-an-objectid').auth(token, { type: 'bearer' }).expect(400); await api().get('/products/0123456789abcdef01234567').auth(token, { type: 'bearer' }).expect(404);
    for (const query of [{ page: 0 }, { page: 10001 }, { page: '1.2' }, { pageSize: 101 }, { sortBy: 'passwordHash' }, { sortDirection: 'sideways' }, { surprise: true }]) {
      const response = await api().get('/products').auth(token, { type: 'bearer' }).query(query).expect(400); expect(response.body).toHaveProperty('correlationId'); expect(response.body).not.toHaveProperty('stack');
    }
  });
  it('builds unique-user, session-TTL and product-query indexes', async () => {
    const users = await mongo!.connection.collection('users').indexes(); expect(users.some(index => index.key.email === 1 && index.unique)).toBe(true);
    const sessions = await mongo!.connection.collection('auth_sessions').indexes(); expect(sessions.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)).toBe(true);
    await expect(mongo!.connection.collection<FixtureUser>('users').insertOne({ _id: randomUUID(), email: EMAIL, passwordHash: 'synthetic-not-used', createdAt: new Date(), updatedAt: new Date() })).rejects.toMatchObject({ code: 11000 });
    expect((await mongo!.connection.collection('products').indexes()).length).toBeGreaterThan(1);
  });
  it('runs the explicit demo seed idempotently and rejects production seed', async () => {
    const run = promisify(execFile); const cli = require.resolve('ts-node/dist/bin.js'); const email = 'seed-fixture@example.test';
    const env = { ...process.env, NODE_ENV: 'development', MONGODB_URI: mongo!.uri, DEMO_USER_EMAIL: email, DEMO_USER_PASSWORD: PASSWORD };
    for (let i = 0; i < 2; i++) {
      const result = await run(process.execPath, [cli, 'scripts/seed-demo.ts'], { cwd: process.cwd(), env, timeout: 20000 });
      expect(result.stdout + result.stderr).not.toContain(PASSWORD);
    }
    expect(await mongo!.connection.collection('users').countDocuments({ email })).toBe(1);
    const rejected = run(process.execPath, [cli, 'scripts/seed-demo.ts'], { cwd: process.cwd(), env: { ...env, NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:1/never_connect' }, timeout: 20000 });
    await expect(rejected).rejects.toMatchObject({ code: 1 });
  }, 60000);
  it('observes guarded failures and successful operations without recording secrets', async () => {
    const denied = await api().get('/products').set('X-Correlation-Id', 'untrusted-correlation').expect(401);
    expect(denied.headers['x-correlation-id']).not.toBe('untrusted-correlation'); expect(denied.body.correlationId).toMatch(/^[\da-f-]{36}$/i);
    const loggedIn = await login().expect(200); await api().get('/auth/me').auth(loggedIn.body.accessToken, { type: 'bearer' }).expect(200); await new Promise(resolve => setImmediate(resolve));
    const events = auditEvents as Array<{ event: string; status: number }>;
    expect(events.some(event => event.event === 'http_request' && event.status === 401)).toBe(true); expect(events.some(event => event.event === 'security_operation' && event.status === 200)).toBe(true);
    const serialized = JSON.stringify(events); for (const secret of [PASSWORD, loggedIn.body.accessToken, refreshCookie(loggedIn).split('=')[1], 'untrusted-correlation']) expect(serialized).not.toContain(secret);
    expect(denied.headers['x-content-type-options']).toBe('nosniff');
  });
  it('rate limits authentication routes including accepted case and trailing-slash aliases', async () => {
    const config = app!.get(ConfigService); config.set('LOGIN_RATE_LIMIT', 1); config.set('REFRESH_RATE_LIMIT', 1);
    try {
      for (const path of ['/auth/login', '/auth/login/', '/AUTH/LOGIN']) await api().post(path).set(CSRF).send({ email: EMAIL, password: PASSWORD }).expect(429);
      for (const path of ['/auth/refresh', '/auth/refresh/', '/AUTH/REFRESH']) await api().post(path).set(CSRF).send({}).expect(429);
    } finally { config.set('LOGIN_RATE_LIMIT', 1000); config.set('REFRESH_RATE_LIMIT', 1000); }
  });
});
