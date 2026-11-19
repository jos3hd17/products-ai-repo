/** Explicit synthetic test infrastructure. No production/development DB is contacted. */
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(here, '../..');
const api = join(root, 'apps/api');
const require = createRequire(join(api, 'package.json'));
const webRequire = createRequire(join(here, 'package.json'));
const { createConnection } = require('mongoose');
const children = [];
let connection;
let directory;
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { interrupted = true; for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM'); });
const email = 'web-fixture@example.test';
const password = 'Synthetic-Only-E2E-Password-2026!';
async function port() {
  const server = createServer();
  await new Promise((r, j) => {
    server.once('error', j);
    server.listen(0, '127.0.0.1', r);
  });
  const result = server.address().port;
  await new Promise((r) => server.close(r));
  return result;
}
function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'ignore', ...options });
  children.push(child);
  return child;
}
function completion(child) {
  return new Promise((r, j) => {
    child.once('error', j);
    child.once('exit', (code) =>
      code === 0 ? r() : j(new Error(`Test subprocess exited ${code}`)),
    );
  });
}
async function waitHttp(url) {
  for (let i = 0; i < 150; i++) {
    if (interrupted) throw new Error('Interrupted; cleaning up owned test resources');
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Test HTTP service did not become ready: ' + url);
}
try {
  if (
    spawnSync(process.env.MONGOD_BINARY ?? 'mongod', ['--version'], { stdio: 'ignore' }).status !==
    0
  )
    throw new Error('BLOCKED: native mongod required for real integration');
  directory = await mkdtemp(join(tmpdir(), 'fieldwork-browser-'));
  const mongoPort = await port();
  const apiPort = await port();
  const webPort = await port();
  const origin = `http://localhost:${webPort}`;
  const uri = `mongodb://127.0.0.1:${mongoPort}/assessment_web_e2e_${randomUUID().replaceAll('-', '')}`;
  start(process.env.MONGOD_BINARY ?? 'mongod', [
    '--dbpath',
    directory,
    '--port',
    String(mongoPort),
    '--bind_ip',
    '127.0.0.1',
    '--nounixsocket',
    '--quiet',
    '--logpath',
    join(directory, 'mongod.log'),
  ]);
  for (let i = 0; i < 50; i++) {
    if (interrupted) throw new Error('Interrupted; cleaning up owned test resources');
    const candidate = createConnection(uri, {
      serverSelectionTimeoutMS: 200,
      connectTimeoutMS: 200,
    });
    try {
      await candidate.asPromise();
      connection = candidate;
      break;
    } catch {
      await candidate.close(true).catch(() => {});
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  if (!connection) throw new Error('BLOCKED: isolated Mongo startup failed');
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(apiPort),
    MONGODB_URI: uri,
    JWT_SECRET: randomBytes(48).toString('base64url'),
    CORS_ORIGINS: origin,
    DEMO_USER_EMAIL: email,
    DEMO_USER_PASSWORD: password,
    LOGIN_RATE_LIMIT: '1000',
    REFRESH_RATE_LIMIT: '1000',
  };
  await completion(
    start(process.execPath, [require.resolve('ts-node/dist/bin.js'), 'scripts/seed-demo.ts'], {
      cwd: api,
      env,
    }),
  );
  start(process.execPath, ['dist/main.js'], { cwd: api, env, stdio: 'inherit' });
  await waitHttp(`http://127.0.0.1:${apiPort}/products`);
  const proxy = join(directory, 'proxy.json');
  await writeFile(
    proxy,
    JSON.stringify({
      '/auth/**': { target: `http://127.0.0.1:${apiPort}`, secure: false, changeOrigin: false },
      '/products': { target: `http://127.0.0.1:${apiPort}`, secure: false, changeOrigin: false },
      '/products/**': { target: `http://127.0.0.1:${apiPort}`, secure: false, changeOrigin: false },
    }),
  );
  start(
    process.execPath,
    [
      webRequire.resolve('@angular/cli/bin/ng.js'),
      'serve',
      '--host',
      'localhost',
      '--port',
      String(webPort),
      '--proxy-config',
      proxy,
    ],
    { cwd: here, stdio: 'inherit' },
  );
  await waitHttp(origin);
  await completion(
    start(process.execPath, [webRequire.resolve('@playwright/test/cli'), 'test'], {
      cwd: here,
      env: {
        ...process.env,
        WEB_E2E_BASE_URL: origin,
        WEB_E2E_EMAIL: email,
        WEB_E2E_PASSWORD: password,
      },
      stdio: 'inherit',
    }),
  );
  await mkdir(join(here, '.test-artifacts'), { recursive: true });
  await writeFile(
    join(here, '.test-artifacts/real-backend-summary.json'),
    JSON.stringify(
      {
        realMongo: true,
        isolatedDatabase: true,
        backendCommit: spawnSync('git', ['rev-parse', 'HEAD'], {
          cwd: root,
          encoding: 'utf8',
        }).stdout.trim(),
        frontendOriginConfigured: true,
        projects: ['desktop', 'mobile'],
        passed: true,
      },
      null,
      2,
    ) + '\n',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await connection?.close(true).catch(() => {});
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    const done = new Promise((r) => child.once('exit', r));
    child.kill('SIGTERM');
    const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
    await done;
    clearTimeout(timeout);
  }
  if (directory) await rm(directory, { recursive: true, force: true });
}
