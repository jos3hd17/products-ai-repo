import { Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { configureApplication } from '../../../bootstrap';
import { AuditEvent } from './audit';
import { DomainError } from '../../domain/domain-error';
import { errorStatus } from '../filters/api-exception.filter';
import { validateEnvironment } from '../configuration/environment';

@Controller()
class TestController {
  @Get('ok') ok():{ok:boolean} {return {ok:true};}
  @Post('bad') bad():never {throw new DomainError('NOT_FOUND','Resource not found');}
  @Get('unexpected') unexpected():never {throw new Error('SYNTHETIC_DATABASE_SECRET');}
}

describe('shared security pipeline',()=>{
  let app:INestApplication;
  const events:AuditEvent[]=[];
  beforeAll(async()=>{
    const config=validateEnvironment({MONGODB_URI:'mongodb://127.0.0.1:27017/synthetic',JWT_SECRET:'synthetic-test-only-32-byte-minimum-secret'});
    const module=await Test.createTestingModule({controllers:[TestController],providers:[{provide:ConfigService,useValue:new ConfigService(config)}]}).compile();
    app=module.createNestApplication({bodyParser:false});
    configureApplication(app,{auditSink:event=>events.push(event)});await app.init();
  });
  afterAll(async()=>{await app.close();});
  it('uses generated correlation IDs and logs metadata only',async()=>{
    const res=await request(app.getHttpServer()).get('/ok').set('X-Correlation-Id','untrusted').set('Authorization','Bearer SYNTHETIC_TOKEN').set('Cookie','refresh_token=SYNTHETIC_COOKIE').expect(200);
    expect(res.headers['x-correlation-id']).not.toBe('untrusted');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(events.some(e=>e.event==='security_operation')).toBe(true);
    expect(events.some(e=>e.event==='http_request')).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/SYNTHETIC_TOKEN|SYNTHETIC_COOKIE/);
  });
  it('maps domain errors and observes failures',async()=>{
    const res=await request(app.getHttpServer()).post('/bad').send({password:'SYNTHETIC_PASSWORD'}).expect(404);
    expect(res.body).toMatchObject({statusCode:404,code:'NOT_FOUND',message:'Resource not found'});
    expect(events.some(e=>e.route==='/bad'&&e.outcome==='failure'&&e.status===404)).toBe(true);
    expect(JSON.stringify(events)).not.toContain('SYNTHETIC_PASSWORD');
  });
  it('sanitizes unexpected errors',async()=>{
    const res=await request(app.getHttpServer()).get('/unexpected').expect(500);
    expect(JSON.stringify(res.body)).not.toContain('SYNTHETIC_DATABASE_SECRET');
    expect(res.body).toMatchObject({code:'INTERNAL_ERROR',message:'An unexpected error occurred'});
  });
  it('rejects malformed or oversized JSON without logging content',async()=>{
    await request(app.getHttpServer()).post('/bad').set('Content-Type','application/json').send('{bad json').expect(400);
    await request(app.getHttpServer()).post('/bad').send({large:'x'.repeat(40000)}).expect(413);
  });
  it('maps every supported domain failure without DB details',()=>{
    for(const [code,status] of Object.entries({INVALID_INPUT:400,UNAUTHORIZED:401,FORBIDDEN:403,NOT_FOUND:404,CONFLICT:409})){expect(errorStatus(new DomainError(code as DomainError['code'],'safe'))).toBe(status);}
  });
});

it('audit sink failure never alters the business result',async()=>{
  const config=validateEnvironment({MONGODB_URI:'mongodb://127.0.0.1:27017/synthetic',JWT_SECRET:'synthetic-test-only-32-byte-minimum-secret'});
  const module=await Test.createTestingModule({controllers:[TestController],providers:[{provide:ConfigService,useValue:new ConfigService(config)}]}).compile();
  const app=module.createNestApplication({bodyParser:false});
  configureApplication(app,{auditSink:()=>{throw new Error('synthetic transport failure');}});
  try{await app.init();await request(app.getHttpServer()).get('/ok').expect(200,{ok:true});}finally{await app.close();}
});
