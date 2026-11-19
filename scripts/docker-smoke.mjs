/** Local-only integration smoke. Credentials stay in .env.docker, never in output. */
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const settings=Object.fromEntries((await readFile('.env.docker','utf8')).trim().split('\n').filter(line=>line&&!line.startsWith('#')).map(line=>{const n=line.indexOf('=');return [line.slice(0,n),line.slice(n+1)];}));
const origin=`http://localhost:${settings.WEB_PORT || 8080}`;
const csrf={Origin:origin,'X-CSRF-Protection':'1','Content-Type':'application/json'};
const checks=[];
let cookie='',token='',id;
async function call(path,{method='GET',body,auth=true,headers={}}={}) {
  return fetch(origin+path,{method,headers:{...csrf,...(auth&&token?{Authorization:`Bearer ${token}`} : {}),...(cookie?{Cookie:cookie}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
function compose(...args) {
  const r=spawnSync('docker',['compose','--env-file','.env.docker',...args],{stdio:'ignore'});
  assert.equal(r.status,0,`Docker operation failed: ${args[0]}`);
}
async function ready() {
  for(let i=0;i<90;i++) {try {if((await fetch(origin+'/api-healthz')).ok)return;}catch{}await new Promise(r=>setTimeout(r,1000));}
  throw new Error('Readiness timeout');
}
try {
  await ready();checks.push('api readiness');
  assert.equal((await fetch(origin+'/catalog')).status,200);checks.push('SPA hard route');
  assert.equal((await call('/products',{auth:false})).status,401);checks.push('JWT protection');
  assert.equal((await call('/auth/login',{method:'POST',auth:false,body:{email:settings.DEMO_USER_EMAIL,password:settings.DEMO_USER_PASSWORD},headers:{Origin:'http://untrusted.example'}})).status,403);checks.push('CSRF disallowed origin');
  const login=await call('/auth/login',{method:'POST',auth:false,body:{email:settings.DEMO_USER_EMAIL,password:settings.DEMO_USER_PASSWORD}});
  assert.equal(login.status,200);token=(await login.json()).accessToken;
  const setCookie=login.headers.get('set-cookie');assert.ok(setCookie?.includes('HttpOnly'));assert.ok(setCookie?.includes('Path=/auth'));assert.match(setCookie,/SameSite=Lax/i);cookie=setCookie.split(';')[0];checks.push('login / HttpOnly cookie');
  const created=await call('/products',{method:'POST',body:{name:'Container persistence fixture',priceMinor:1599,stock:0,category:'Docker smoke'}});assert.equal(created.status,201);id=(await created.json()).id;checks.push('create');
  const listed=await call('/products?search=Container%20persistence&category=Docker%20smoke&page=1&pageSize=1&sortBy=priceMinor&sortDirection=asc');assert.equal(listed.status,200);const page=await listed.json();assert.equal(page.itemCount,1);assert.equal(page.items[0].id,id);assert.equal(page.page,1);assert.equal(page.filters.category,'Docker smoke');checks.push('server filters/pagination');
  const patched=await call('/products/'+id,{method:'PATCH',body:{stock:3}});assert.equal(patched.status,200);assert.equal((await patched.json()).stock,3);checks.push('update');
  compose('restart','mongo','api','web');await ready();
  const persisted=await call('/products/'+id);assert.equal(persisted.status,200);assert.equal((await persisted.json()).stock,3);checks.push('persistence after container restart');
  const refresh=await call('/auth/refresh',{method:'POST',body:{},auth:false});assert.equal(refresh.status,200);token=(await refresh.json()).accessToken;cookie=refresh.headers.get('set-cookie').split(';')[0];checks.push('refresh after restart');
  compose('stop','mongo');
  try {assert.equal((await fetch(origin+'/api-healthz')).status,503);checks.push('readiness fails while database stopped');}finally {compose('start','mongo');await ready();}
  const deleted=await call('/products/'+id,{method:'DELETE'});assert.equal(deleted.status,204);id=undefined;checks.push('delete');
  const logout=await call('/auth/logout',{method:'POST',body:{},auth:false});assert.equal(logout.status,204);
  assert.equal((await call('/auth/refresh',{method:'POST',body:{},auth:false})).status,401);checks.push('logout revokes refresh');
  console.log(`${checks.length} Docker smoke checks passed; no credentials recorded.`);
} finally {
  if(id) await call('/products/'+id,{method:'DELETE'}).catch(()=>{});
}
