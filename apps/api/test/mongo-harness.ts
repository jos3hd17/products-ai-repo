import { spawn, spawnSync, ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import * as os from 'node:os';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Connection, createConnection } from 'mongoose';
export interface IsolatedMongo { readonly uri: string; readonly connection: Connection; stop(): Promise<void>; }
async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Cannot allocate an isolated MongoDB port');
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}
async function stopProcess(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const stopped = new Promise<void>(resolve => child.once('exit', () => resolve()));
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
  try { await stopped; } finally { clearTimeout(timer); }
}
/** Starts an isolated loopback process with disposable data; never uses an existing Mongo URI. */
export async function startIsolatedMongo(): Promise<IsolatedMongo> {
  const binary = process.env.MONGOD_BINARY || 'mongod';
  const available = spawnSync(binary, ['--version'], { stdio: 'ignore' });
  if (available.error || available.status !== 0) throw new Error('BLOCKED Mongo integration precondition: mongod unavailable. Passing unit tests do not establish Mongo integration.');
  const directory = await mkdtemp(join(tmpdir(), 'products-api-integration-'));
  const port = await availablePort();
  const uri = `mongodb://127.0.0.1:${port}/assessment_test_${randomUUID().replaceAll('-', '')}`;
  const child = spawn(binary, ['--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--nounixsocket', '--quiet', '--logpath', join(directory, 'mongod.log')], { stdio: 'ignore' });
  let startupError: Error | undefined;
  child.once('error', error => { startupError = error; });
  let connection: Connection | undefined;
  const deadline = Date.now() + 15000;
  let lastConnectionError = "none";
  try {
    while (Date.now() < deadline) {
      if (startupError || child.exitCode !== null) break;
      const candidate = createConnection(uri, { serverSelectionTimeoutMS: 300, connectTimeoutMS: 300, runtimeAdapters: { os } });
      try { await candidate.asPromise(); connection = candidate; break; }
      catch (error) { lastConnectionError = error instanceof Error ? error.message : "unknown"; await candidate.close(true).catch(() => undefined); await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    if (!connection) throw new Error('BLOCKED Mongo integration precondition: isolated mongod not ready; no production database contacted. Last synthetic-test connection error: '+lastConnectionError);
    return { uri, connection, async stop(): Promise<void> {
      try { await connection?.close(true); }
      finally { await stopProcess(child); await rm(directory, { recursive: true, force: true }); }
    } };
  } catch (error) {
    await connection?.close(true).catch(() => undefined);
    await stopProcess(child); await rm(directory, { recursive: true, force: true }); throw error;
  }
}
