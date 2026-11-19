/** Load only the local review stack. Never prints credentials or changes its rate settings. */
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');process.chdir(root);
const settings=Object.fromEntries((await readFile('.env.docker','utf8')).trim().split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const n=l.indexOf('=');return [l.slice(0,n),l.slice(n+1)];}));
const origin=`http://localhost:${settings.WEB_PORT||8080}`;
const statePath='apps/web/.test-artifacts/products-stress-fixture.json';
function docker(args,input) {
 const r=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:8*1024*1024});
 if(r.status!==0) throw new Error('Docker operation failed: '+args.slice(0,3).join(' '));
 return r.stdout.trim();
}
function database(body) {
 const program=`const mongoose=require('mongoose');const {createHash}=require('node:crypto');(async()=>{await mongoose.connect(process.env.MONGODB_URI);const {ProductSchema}=require('./dist/modules/products/infrastructure/persistence/mongoose/schemas/product.schema');const model=mongoose.model('Product',ProductSchema);await model.init();try{${body}}finally{await mongoose.disconnect()}})().catch(()=>{console.error('Local load fixture operation failed');process.exitCode=1});`;
 return JSON.parse(docker(['compose','--env-file','.env.docker','exec','-T','api','node','-'],program));
}
let state;
try {state=JSON.parse(await readFile(statePath,'utf8'));} catch(error) {if(error.code!=='ENOENT')throw error;}
if(process.argv.includes('--cleanup')) {
 if(!state){console.log('No owned load fixture to remove.');process.exit(0);}
 const result=database(`const r=await model.deleteMany({description:${JSON.stringify(state.marker)}});console.log(JSON.stringify({deleted:r.deletedCount}));`);
 await rm(statePath);console.log(`Removed ${result.deleted} owned synthetic products; other products untouched.`);process.exit(0);
}
if(!state) {
 const suffix=randomUUID().slice(0,8);const marker=`synthetic-load-products-${randomUUID()}`;const prefix=`Carga5000 ${suffix}`;
 const baseline=database(`const rows=await model.find({}).sort({_id:1}).lean();console.log(JSON.stringify({ids:rows.map(r=>String(r._id)),count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex')}));`);
 state={marker,prefix,baseline};await mkdir('apps/web/.test-artifacts',{recursive:true});await writeFile(statePath,JSON.stringify(state,null,2)+'\n');
}
const count=database(`console.log(JSON.stringify({count:await model.countDocuments({description:${JSON.stringify(state.marker)}})}));`).count;
let seedDurationMs=null;
if(count===0) {
 const result=database(`const start=performance.now();const categories=['Semillas','Fertilizantes','Herramientas','Riego','Sustratos','Proteccion','Alimentos','Equipos','Repuestos','Accesorios'];const startDate=Date.UTC(2026,0,1);const rows=Array.from({length:5000},(_,j)=>{const i=j+1;return {name:${JSON.stringify(state.prefix)}+' Producto '+String(i).padStart(5,'0'),description:${JSON.stringify(state.marker)},category:${JSON.stringify(state.prefix)}+' - '+categories[j%10],priceMinor:i*37,stock:i%101,createdAt:new Date(startDate+i*1000),updatedAt:new Date(startDate+i*1000)}});await model.insertMany(rows,{ordered:true});console.log(JSON.stringify({inserted:rows.length,milliseconds:performance.now()-start}));`);
 seedDurationMs=result.milliseconds;
} else assert.equal(count,5000,'Partial fixture found; use --cleanup before retrying.');
const fixture=database(`console.log(JSON.stringify({count:await model.countDocuments({description:${JSON.stringify(state.marker)}}),all:await model.countDocuments({}),indexes:(await model.collection.indexes()).map(i=>({name:i.name,key:i.key}))}));`);
assert.equal(fixture.count,5000);
console.log(`Dataset ready: 5000 owned fixtures + ${state.baseline.count} pre-existing products.`);
const prefix=state.prefix;const category=prefix+' - Semillas';
const cases=[
 {name:'Default list',query:{},minimumTotal:5000},
 {name:'Fixture first page',query:{search:prefix,page:1,pageSize:20},total:5000,count:20},
 {name:'Fixture last page',query:{search:prefix,page:50,pageSize:100,sortBy:'name',sortDirection:'asc'},total:5000,count:100},
 {name:'Beyond last page',query:{search:prefix,page:51,pageSize:100},total:5000,count:0},
 {name:'Exact category',query:{category,pageSize:100},total:500,count:100},
 {name:'Case insensitive substring',query:{search:prefix+' PRODUCTO 049',pageSize:100},total:100,count:100},
 {name:'Search and category',query:{search:prefix+' Producto 049',category,pageSize:100},total:10,count:10},
 {name:'No matches',query:{search:prefix+' inexistente'},total:0,count:0},
 {name:'Escaped regex characters',query:{search:prefix+' .*'},total:0,count:0},
 ...['name','priceMinor','stock','createdAt','updatedAt'].flatMap(sortBy=>['asc','desc'].map(sortDirection=>({name:`Order ${sortBy} ${sortDirection}`,query:{search:prefix,pageSize:100,sortBy,sortDirection},total:5000,count:100,sortBy,sortDirection}))),
];
const queryString=q=>new URLSearchParams(Object.entries(q).map(([k,v])=>[k,String(v)])).toString();
async function login(base) {
 const r=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-CSRF-Protection':'1'},body:JSON.stringify({email:settings.DEMO_USER_EMAIL,password:settings.DEMO_USER_PASSWORD}),signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,200,'Load login failed');return (await r.json()).accessToken;
}
function validate(test,data) {
 assert.ok(Array.isArray(data.items));assert.equal(data.itemCount,data.items.length);assert.equal(data.page,Number(test.query.page||1));assert.equal(data.pageSize,Number(test.query.pageSize||20));assert.equal(data.totalPages,Math.ceil(data.total/data.pageSize));
 if(test.total!==undefined)assert.equal(data.total,test.total);if(test.count!==undefined)assert.equal(data.items.length,test.count);if(test.minimumTotal)assert.ok(data.total>=test.minimumTotal);
 assert.equal(data.filters.search,test.query.search??null);assert.equal(data.filters.category,test.query.category??null);
 for(const item of data.items) {
  if(test.query.search)assert.ok(item.name.toLowerCase().includes(test.query.search.toLowerCase()));
  if(test.query.category)assert.equal(item.category,test.query.category);
 }
 if(test.sortBy)for(let i=1;i<data.items.length;i++){
  const a=data.items[i-1],b=data.items[i],key=test.sortBy;const av=a[key],bv=b[key];const comparison=av===bv?(a.id<b.id?-1:a.id>b.id?1:0):(av<bv?-1:1);
  assert.ok(test.sortDirection==='asc'?comparison<=0:comparison>=0,'Incorrect sort order');
 }
}
async function request(base,token,test) {
 const start=performance.now();const r=await fetch(base+'/products?'+queryString(test.query),{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
 const text=await r.text();assert.equal(r.status,200,'Unexpected HTTP '+r.status);const data=JSON.parse(text);validate(test,data);
 return {milliseconds:performance.now()-start,bytes:Buffer.byteLength(text)};
}
const runId=randomUUID().slice(0,8);const apiName=`products-stress-${runId}-api`,webName=`products-stress-${runId}-web`,image=`products-stress-${runId}:local`;
const temp=await mkdtemp(join(tmpdir(),'products-stress-'));let apiCreated=false,webCreated=false,imageCreated=false,monitor;
const peaks={};let monitorBuffer='';
const result={date:new Date().toISOString(),dataset:{inserted:5000,preExisting:state.baseline.count,total:fixture.all,seedDurationMs,bulkSeeding:'Mongoose insertMany; not 5000 HTTP create requests',namePrefix:prefix},environment:{scope:'Local Docker Desktop, shared host, warm caches; no production capacity claim',loadOrigin:'http://127.0.0.1:18080',reviewOrigin:origin,readiness:'/api-healthz',capacityRateWindowMs:1,normalRateWindowMs:60000,auditLogsEnabled:true,docker:JSON.parse(docker(['info','--format','{"cpus":{{.NCPU}},"memoryBytes":{{.MemTotal}},"serverVersion":"{{.ServerVersion}}"}']))},functional:[],stages:[]};
function createApi(ttl) {
 docker(['compose','--env-file','.env.docker','run','--rm','-d','--no-deps','--name',apiName,'--label','assessment.load-test=true','-e',`RATE_WINDOW_MS=${ttl}`,'api']);apiCreated=true;
}
async function ready() {for(let i=0;i<90;i++){try{if((await fetch('http://127.0.0.1:18080/api-healthz',{signal:AbortSignal.timeout(2000)})).ok)return;}catch{}await new Promise(r=>setTimeout(r,1000));}throw new Error('Load stack readiness timeout');}
try {
 // Build a temporary proxy from the same frontend image. Review containers/settings stay unchanged.
 const config=(await readFile('deploy/nginx/nginx.conf','utf8')).replaceAll('api:3000',apiName+':3000');
 await writeFile(join(temp,'nginx.conf'),config);await writeFile(join(temp,'Dockerfile'),`FROM products-review-web:local\nCOPY nginx.conf /etc/nginx/nginx.conf\n`);
 createApi(1);docker(['build','-q','-t',image,temp]);imageCreated=true;
 docker(['run','--rm','-d','--name',webName,'--label','assessment.load-test=true','--network','products-review_edge','-p','127.0.0.1:18080:8080','--read-only','--tmpfs','/tmp','--cap-drop','ALL','--security-opt','no-new-privileges:true',image]);webCreated=true;
 await ready();const base='http://127.0.0.1:18080';let token=await login(base);
 for(const test of cases){const r=await request(base,token,test);result.functional.push({case:test.name,passed:true,milliseconds:+r.milliseconds.toFixed(2)});}
 // Verify stable paging without duplicates.
 const p1=await (await fetch(base+'/products?'+queryString({search:prefix,pageSize:100,page:1,sortBy:'name',sortDirection:'asc'}),{headers:{Authorization:`Bearer ${token}`}})).json();
 const p2=await (await fetch(base+'/products?'+queryString({search:prefix,pageSize:100,page:2,sortBy:'name',sortDirection:'asc'}),{headers:{Authorization:`Bearer ${token}`}})).json();
 assert.equal(new Set([...p1.items,...p2.items].map(p=>p.id)).size,200);result.functional.push({case:'No duplicate IDs across adjacent pages',passed:true});
 const allIds=new Set();
 for(let pageNumber=1;pageNumber<=50;pageNumber++) {
  const test={name:'Full traversal',query:{search:prefix,pageSize:100,page:pageNumber,sortBy:'name',sortDirection:'asc'},total:5000,count:100,sortBy:'name',sortDirection:'asc'};
  const response=await fetch(base+'/products?'+queryString(test.query),{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);const data=await response.json();validate(test,data);
  for(const item of data.items){assert.ok(!allIds.has(item.id),'Duplicate between pages');allIds.add(item.id);}
 }
 assert.equal(allIds.size,5000);result.functional.push({case:'All 50 pages return exactly 5000 unique products',passed:true});
 const workloads=[cases[0],cases[1],cases[2],cases[4],cases[5],cases[6],cases[7]];
 for(let i=0;i<21;i++)await request(base,token,workloads[i%workloads.length]);
 monitor=spawn('docker',['stats','--format','{{json .}}',apiName,webName,'products-review-mongo-1'],{stdio:['ignore','pipe','ignore']});
 monitor.stdout.on('data',chunk=>{monitorBuffer+=chunk.toString().replace(/\x1b\[[0-9;]*[A-Za-z]/g,'');let n;while((n=monitorBuffer.indexOf('\n'))>=0){const line=monitorBuffer.slice(0,n);monitorBuffer=monitorBuffer.slice(n+1);try{const d=JSON.parse(line);const mib=value=>{const m=value.match(/([\d.]+)([KMGT]?i?B)/);return m?Number(m[1])*({B:1/1048576,kB:1/1024,KiB:1/1024,MB:1,MiB:1,GB:1024,GiB:1024}[m[2]]??1):0;};const p=peaks[d.Name]??{peakCpuPercent:0,peakMemoryMiB:0,samples:0};const cpu=parseFloat(d.CPUPerc);if(Number.isFinite(cpu))p.peakCpuPercent=Math.max(p.peakCpuPercent,cpu);p.peakMemoryMiB=Math.max(p.peakMemoryMiB,mib(d.MemUsage.split('/')[0]));p.samples++;peaks[d.Name]=p;}catch{}}});
 for(const concurrency of [1,10,30,60]) {
  const latencies=[],errors={},perCase={};let bytes=0,next=0;const start=performance.now(),deadline=start+8000;
  await Promise.all(Array.from({length:concurrency},async()=>{while(performance.now()<deadline){const test=workloads[next++%workloads.length];try{const r=await request(base,token,test);latencies.push(r.milliseconds);bytes+=r.bytes;(perCase[test.name]??=[]).push(r.milliseconds);}catch(e){const key=e.name==='TimeoutError'?'timeout':e.message.slice(0,100);errors[key]=(errors[key]??0)+1;}}}));
  const elapsed=(performance.now()-start)/1000;latencies.sort((a,b)=>a-b);const percentile=p=>latencies[Math.max(0,Math.ceil(latencies.length*p)-1)]??null;
  const summary={concurrency,durationSeconds:+elapsed.toFixed(2),successfulRequests:latencies.length,failedRequests:Object.values(errors).reduce((a,b)=>a+b,0),errors,successfulRequestsPerSecond:+(latencies.length/elapsed).toFixed(2),p50Ms:+percentile(.5)?.toFixed(2),p95Ms:+percentile(.95)?.toFixed(2),p99Ms:+percentile(.99)?.toFixed(2),maxMs:+latencies.at(-1)?.toFixed(2),responseBytes:bytes,perCase:Object.fromEntries(Object.entries(perCase).map(([k,v])=>{v.sort((a,b)=>a-b);return[k,{requests:v.length,p95Ms:+v[Math.ceil(v.length*.95)-1].toFixed(2)}]}))};
  result.stages.push(summary);await writeFile('docs/pruebas-carga.json',JSON.stringify({...result,passed:false,status:'in_progress'},null,2)+'\n');console.log(`Concurrency ${concurrency}: ${summary.successfulRequests} success, ${summary.failedRequests} failed, p95 ${summary.p95Ms}ms.`);
 }
 const sampler=monitor;if(sampler.exitCode===null)await new Promise(resolve=>{sampler.once('close',resolve);sampler.kill('SIGKILL');});monitor=undefined;result.resources={api:peaks[apiName],web:peaks[webName],mongo:peaks['products-review-mongo-1']};
 // Fresh temporary API with NORMAL limits; do not exhaust the review API's counter.
 docker(['rm','-f',apiName]);apiCreated=false;createApi(60000);await ready();token=await login(base);
 const rate=await Promise.all(Array.from({length:130},async()=>{const r=await fetch(base+'/products?pageSize=20',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});await r.arrayBuffer();return{status:r.status,retryAfter:r.headers.get('retry-after')};}));
 result.rateLimit={requests:130,statuses:Object.fromEntries([...new Set(rate.map(r=>r.status))].map(status=>[status,rate.filter(r=>r.status===status).length])),rejectedHaveRetryAfter:rate.filter(r=>r.status===429).every(r=>Number(r.retryAfter)>0)};
 assert.equal(result.rateLimit.statuses[200],100);assert.equal(result.rateLimit.statuses[429],30);assert.equal(result.rateLimit.rejectedHaveRetryAfter,true);
 result.queryPlans=database(`const tests=[{name:'Global newest',filter:{},sort:{createdAt:-1,_id:-1},skip:0},{name:'Exact category and price',filter:{category:${JSON.stringify(category)}},sort:{priceMinor:1,_id:1},skip:0},{name:'Substring search',filter:{name:{$regex:${JSON.stringify(prefix+' Producto 049')},$options:'i'}},sort:{createdAt:-1,_id:-1},skip:0},{name:'Last page with search',filter:{name:{$regex:${JSON.stringify(prefix)},$options:'i'}},sort:{name:1,_id:1},skip:4900}];const output=[];for(const t of tests){const e=await model.find(t.filter).sort(t.sort).skip(t.skip).limit(100).explain('executionStats');const count=await model.collection.aggregate([{$match:t.filter},{$count:'total'}]).explain('executionStats');const cs=count.executionStats??count.stages?.find(s=>s.$cursor)?.$cursor?.executionStats;output.push({case:t.name,returned:e.executionStats.nReturned,documentsExamined:e.executionStats.totalDocsExamined,keysExamined:e.executionStats.totalKeysExamined,executionTimeMs:e.executionStats.executionTimeMillis,plan:e.queryPlanner.winningPlan,countDocumentsExamined:cs?.totalDocsExamined??null,countKeysExamined:cs?.totalKeysExamined??null});}console.log(JSON.stringify(output));`);
 result.queryPlans=result.queryPlans.map(({plan,...stats})=>{
  const indexes=new Set(),stages=new Set();const walk=node=>{if(!node||typeof node!=='object')return;if(node.stage)stages.add(node.stage);if(node.indexName)indexes.add(node.indexName);for(const value of Object.values(node))walk(value);};walk(plan);
  return {...stats,indexes:[...indexes],stages:[...stages]};
 });
 const webRequire=createRequire(join(root,'apps/web/package.json'));const {chromium}=webRequire('@playwright/test');const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 result.browser=[];
 try{for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(origin+'/catalog');await page.getByLabel('Correo electrónico').fill(settings.DEMO_USER_EMAIL);await page.getByLabel('Contraseña',{exact:true}).fill(settings.DEMO_USER_PASSWORD);await page.getByRole('button',{name:/Ingresar al catálogo/}).click();await page.getByRole('heading',{name:/Tu catálogo de productos/}).waitFor();
  const search=page.getByLabel('Buscar productos');let response=page.waitForResponse(r=>r.url().includes('/products?')&&new URL(r.url()).searchParams.get('search')===prefix&&r.status()===200);const began=performance.now();await search.fill(prefix);await response;await page.getByText('5000 productos',{exact:false}).first().waitFor();
  const observedRows=await page.locator('tbody tr').count();assert.equal(observedRows,20);await page.getByRole('button',{name:'Página siguiente',exact:true}).click();await page.waitForURL(/page=2/);
  response=page.waitForResponse(r=>r.url().includes('/products?')&&new URL(r.url()).searchParams.get('category')===category&&r.status()===200);await page.getByLabel('Filtrar por categoría').fill(category);await response;await page.getByText('500 productos',{exact:false}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(pageErrors.length,0);
  result.browser.push({viewport,filteredRowsObserved:observedRows,total:5000,categoryTotal:500,paginationWorks:true,documentOverflow:false,pageErrors,interactionDurationMs:+(performance.now()-began).toFixed(2),note:'Duration includes search debounce, page navigation and category filtering; not LCP.'});await context.close();
 }}finally{await browser.close();}
 const preserved=database(`const rows=await model.find({_id:{$in:${JSON.stringify(state.baseline.ids)}.map(id=>new mongoose.Types.ObjectId(id))}}).sort({_id:1}).lean();console.log(JSON.stringify({count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),fixtures:await model.countDocuments({description:${JSON.stringify(state.marker)}})}));`);
 result.originalDataUnchanged=preserved.hash===state.baseline.hash&&preserved.count===state.baseline.count;assert.ok(result.originalDataUnchanged);assert.equal(preserved.fixtures,5000);
 result.passed=result.stages.every(s=>s.failedRequests===0);result.fixturesLeftForReview=true;
 await writeFile('docs/pruebas-carga.json',JSON.stringify(result,null,2)+'\n');
 console.log(`Complete: ${result.functional.length} functional cases, ${result.browser.length} browser viewports, rate limit verified. Fixtures remain on ${origin}.`);
 if(!result.passed)process.exitCode=1;
}finally{
 monitor?.kill('SIGKILL');
 if(webCreated)docker(['rm','-f',webName]);
 if(apiCreated)docker(['rm','-f',apiName]);
 if(imageCreated)docker(['image','rm',image]);
 await rm(temp,{recursive:true,force:true});
}
