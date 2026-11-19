import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { OpenAPIObject } from '@nestjs/swagger';
import { ProductsController } from '../../modules/products/infrastructure/http/controllers/products.controller';
import { AuthController } from '../../modules/auth/infrastructure/http/controllers/auth.controller';
import { CookieOriginGuard } from '../../shared/infrastructure/security/cookie-origin.guard';
import { createApiDocument } from './swagger';
const disabledBus={execute:()=>{throw new Error('Documentation-only container cannot execute API operations');}};
@Module({controllers:[ProductsController,AuthController],providers:[CookieOriginGuard,
  {provide:CommandBus,useValue:disabledBus},{provide:QueryBus,useValue:disabledBus},
  {provide:ConfigService,useValue:new ConfigService({})}]})
class DocumentationModule {}
/** Real controller metadata, no database, no listener, no business execution or secrets. */
export async function exportApiDocument():Promise<OpenAPIObject> {
  const app=await NestFactory.create(DocumentationModule,{logger:false,bodyParser:false});
  try {await app.init();return createApiDocument(app);} finally {await app.close();}
}
export function canonicalApiJson(value:unknown):string {
  const sorted=(item:unknown):unknown=>Array.isArray(item)?item.map(sorted):item!==null&&typeof item==='object'?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,sorted(v)])):item;
  return JSON.stringify(sorted(value),null,2)+'\n';
}
