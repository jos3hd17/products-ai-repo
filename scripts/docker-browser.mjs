/** Run existing real browser flows against the running Compose stack. No secret output. */
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const settings=Object.fromEntries((await readFile('.env.docker','utf8')).trim().split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>{const n=line.indexOf('=');return [line.slice(0,n),line.slice(n+1)];}));
const result=spawnSync('pnpm',['--filter','@assessment/web','e2e'],{stdio:'inherit',env:{...process.env,WEB_E2E_BASE_URL:`http://localhost:${settings.WEB_PORT||8080}`,WEB_E2E_EMAIL:settings.DEMO_USER_EMAIL,WEB_E2E_PASSWORD:settings.DEMO_USER_PASSWORD}});
process.exitCode=result.status ?? 1;
