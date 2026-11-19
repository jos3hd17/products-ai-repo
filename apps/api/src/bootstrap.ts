import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json } from 'express';
import { ApiExceptionFilter } from './shared/infrastructure/filters/api-exception.filter';
import { AuditSink, defaultAuditSink, requestAuditMiddleware, SecurityAuditInterceptor } from './shared/infrastructure/security/audit';
export function configureApplication(app:INestApplication, options:{auditSink?:AuditSink} = {}):void {
  const config=app.get(ConfigService);
  const express=app.getHttpAdapter().getInstance() as {disable(name:string):void;set(name:string,value:unknown):void};
  express.disable('x-powered-by');express.set('trust proxy',false);
  // Must precede parsers/guards so failures are observed without logging bodies.
  const sink=options.auditSink ?? defaultAuditSink;
  app.use(requestAuditMiddleware(sink));app.use(helmet());app.use(json({limit:'32kb'}));app.use(cookieParser());
  app.enableCors({origin:config.getOrThrow<string[]>('CORS_ORIGINS'),credentials:true,
    methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization','X-CSRF-Protection'],
    exposedHeaders:['X-Correlation-Id']});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,forbidUnknownValues:true,transform:true,
    transformOptions:{enableImplicitConversion:false},validationError:{target:false,value:false}}));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new SecurityAuditInterceptor(sink));
}
