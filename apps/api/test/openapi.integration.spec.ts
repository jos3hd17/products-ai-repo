import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import request from 'supertest';
import { createApiDocument,setupSwagger } from '../src/core/openapi/swagger';
import { canonicalApiJson,exportApiDocument } from '../src/core/openapi/export-document';
import { startIsolatedMongo,IsolatedMongo } from './mongo-harness';
const origin='http://localhost:4200';
const csrf={Origin:origin,'X-CSRF-Protection':'1'};
const email='openapi-fixture@example.test';
const password='Synthetic-Only-OpenAPI-Password';
describe('OpenAPI matches the real API and development Swagger routes',()=>{
  let mongo:IsolatedMongo|undefined;let app:INestApplication|undefined;
  let validators:Record<string,ValidateFunction>;let offline:Awaited<ReturnType<typeof exportApiDocument>>;
  const saved={...process.env};
  beforeAll(async()=>{
    try {
      mongo=await startIsolatedMongo();
      Object.assign(process.env,{NODE_ENV:'test',SWAGGER_ENABLED:'true',MONGODB_URI:mongo.uri,JWT_SECRET:'synthetic-openapi-signing-secret-32bytes-min',CORS_ORIGINS:origin,LOGIN_RATE_LIMIT:'1000',REFRESH_RATE_LIMIT:'1000'});
      const {AppModule}=await import('../src/app.module');
      const {configureApplication}=await import('../src/bootstrap');
      const {ScryptPasswordHasher}=await import('../src/modules/auth/infrastructure/security/hashing/scrypt-password.hasher');
      const module=await Test.createTestingModule({imports:[AppModule]}).compile();
      app=module.createNestApplication({logger:false,bodyParser:false});configureApplication(app,{auditSink:()=>undefined});
      expect(setupSwagger(app)).toBe(true);await app.init();
      await Promise.all(Object.values(app.get<Connection>(getConnectionToken()).models).map(model=>model.init()));
      await mongo.connection.collection<{_id:string;email:string;passwordHash:string;createdAt:Date;updatedAt:Date}>('users').insertOne({_id:randomUUID(),email,passwordHash:await new ScryptPasswordHasher().hash(password),createdAt:new Date(),updatedAt:new Date()});
      offline=await exportApiDocument();
      const parsed=await SwaggerParser.dereference(JSON.parse(JSON.stringify(offline)),{resolve:{external:false}}) as unknown as {components:{schemas:Record<string,object>}};
      const ajv=new Ajv({strict:false,allErrors:true});addFormats(ajv);ajv.addFormat('password',true);
      validators=Object.fromEntries(Object.entries(parsed.components.schemas).map(([name,schema])=>[name,ajv.compile(schema)]));
    } catch(error) {await app?.close();await mongo?.stop();app=undefined;mongo=undefined;throw error;}
  });
  afterAll(async()=>{try{await app?.close();}finally{await mongo?.stop();for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);}});
  const api=()=>request(app!.getHttpServer());
  const matches=(schema:string,body:unknown)=>expect(validators[schema](body)).toBe(true);
  it('exports valid OpenAPI3 with identical offline/live metadata and a fresh checked-in contract',async()=>{
    await SwaggerParser.validate(JSON.parse(JSON.stringify(offline)),{resolve:{external:false}});
    expect(offline.openapi).toBe('3.0.3');expect(canonicalApiJson(createApiDocument(app!))).toBe(canonicalApiJson(offline));
    expect(await readFile(resolve(__dirname,'../../../docs/api/openapi.json'),'utf8')).toBe(canonicalApiJson(offline));
    const methods=new Set(['get','post','patch','delete']);
    expect(Object.values(offline.paths).flatMap(path=>Object.keys(path).filter(method=>methods.has(method)))).toHaveLength(9);
    expect(offline.paths).not.toHaveProperty('/auth/register');
  });
  it('documents distinct Bearer, required refresh cookie and optional logout cookie policies',()=>{
    expect(offline.paths['/auth/login'].post?.security).toEqual([]);
    expect(offline.paths['/auth/refresh'].post?.security).toEqual([{'refresh-cookie':[]}]);
    expect(offline.paths['/auth/logout'].post?.security).toEqual([{}, {'refresh-cookie':[]}]);
    for(const path of ['/products','/products/{id}'])for(const [method,operation] of Object.entries(offline.paths[path]))if(['get','post','patch','delete'].includes(method))expect(operation.security).toEqual([{'access-token':[]}]);
    for(const path of ['/auth/login','/auth/refresh','/auth/logout']){
      const headers=offline.paths[path].post?.parameters?.filter(p=>'in' in p&&p.in==='header');
      expect(headers).toEqual(expect.arrayContaining([expect.objectContaining({name:'Origin',required:true}),expect.objectContaining({name:'X-CSRF-Protection',required:true})]));
    }
  });
  it('serves local UI, local initializer and only the configured raw JSON route',async()=>{
    await api().get('/docs/').expect(200).expect('Content-Type',/html/);
    const init=await api().get('/docs/swagger-ui-init.js').expect(200);
    expect(init.text).toContain('X-CSRF-Protection');expect(init.text).toContain('persistAuthorization');
    const json=await api().get('/docs/openapi.json').expect(200);expect(canonicalApiJson(json.body)).toBe(canonicalApiJson(offline));
    await api().get('/docs-yaml').expect(404);
  });
  it('creates every supported category/sort index in Mongo',async()=>{
    const indexes=(await mongo!.connection.collection('products').indexes()).map(index=>index.key);
    for(const field of ['name','priceMinor','stock','updatedAt']) expect(indexes).toEqual(expect.arrayContaining([{[field]:1,_id:1},{category:1,[field]:1,_id:1}]));
  });
  it('validates actual auth/CRUD/error JSON against exported response schemas',async()=>{
    const login=await api().post('/auth/login').set(csrf).send({email,password}).expect(200);matches('TokenResponseDto',login.body);
    const cookie=String(login.headers['set-cookie'][0]).split(';')[0];const token=login.body.accessToken as string;
    const me=await api().get('/auth/me').auth(token,{type:'bearer'}).expect(200);matches('CurrentUserResponseDto',me.body);
    const created=await api().post('/products').auth(token,{type:'bearer'}).send({name:'Documented seed',priceMinor:1299,stock:2}).expect(201);matches('ProductResponseDto',created.body);
    const id=created.body.id as string;
    const listed = await api().get('/products').query({search:'Documented', sortBy:'priceMinor', sortDirection:'asc', pageSize:1}).auth(token,{type:'bearer'}).expect(200);
    matches('ProductPageResponseDto',listed.body);
    expect(listed.body).toMatchObject({itemCount:1,page:1,pageSize:1,filters:{search:'Documented',category:null,sortBy:'priceMinor',sortDirection:'asc'}});
    const beyond = await api().get('/products').query({search:'Documented',page:100,pageSize:1}).auth(token,{type:'bearer'}).expect(200);
    expect(beyond.body).toMatchObject({items:[],itemCount:0,page:100,pageSize:1,total:listed.body.total,totalPages:listed.body.totalPages});
    matches('ProductResponseDto',(await api().get(`/products/${id}`).auth(token,{type:'bearer'}).expect(200)).body);
    matches('ProductResponseDto',(await api().patch(`/products/${id}`).auth(token,{type:'bearer'}).send({stock:0}).expect(200)).body);
    matches('ApiErrorResponseDto',(await api().get('/products').expect(401)).body);
    matches('ApiErrorResponseDto',(await api().post('/products').auth(token,{type:'bearer'}).send({stock:-1}).expect(400)).body);
    const refresh=await api().post('/auth/refresh').set(csrf).set('Cookie',cookie).send({}).expect(200);matches('TokenResponseDto',refresh.body);
    await api().delete(`/products/${id}`).auth(token,{type:'bearer'}).expect(204);
    matches('ApiErrorResponseDto',(await api().get(`/products/${id}`).auth(token,{type:'bearer'}).expect(404)).body);
    await api().post('/auth/logout').set(csrf).send({}).expect(204);
  });
  it('makes request constraints explicit without weakening runtime validation',()=>{
    expect(validators.CreateProductDto({name:'Seed',priceMinor:1299,stock:1})).toBe(true);
    for(const input of [{name:'Seed',priceMinor:1.5,stock:0},{name:'Seed',priceMinor:1,stock:0,unknown:true},{name:'Seed',priceMinor:1,stock:0,category:null}])expect(validators.CreateProductDto(input)).toBe(false);
    expect(validators.UpdateProductDto({})).toBe(false);expect(validators.UpdateProductDto({stock:null})).toBe(false);expect(validators.UpdateProductDto({stock:0})).toBe(true);
  });
});
it.each(['production','test'])('does not register Swagger endpoints when disabled (%s)',async nodeEnv=>{
  const module=await Test.createTestingModule({providers:[{provide:ConfigService,useValue:new ConfigService({NODE_ENV:nodeEnv,SWAGGER_ENABLED:nodeEnv==='production'})}]}).compile();
  const app=module.createNestApplication({logger:false});
  try{expect(setupSwagger(app)).toBe(false);await app.init();await request(app.getHttpServer()).get('/docs/').expect(404);await request(app.getHttpServer()).get('/docs/openapi.json').expect(404);}finally{await app.close();}
});
