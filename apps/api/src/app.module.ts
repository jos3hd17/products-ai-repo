import { ExecutionContext, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from './core/database/database.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { validateEnvironment } from './shared/infrastructure/configuration/environment';
import { JwtAuthGuard } from './shared/infrastructure/security/jwt-auth.guard';
@Module({imports:[CqrsModule.forRoot(),ConfigModule.forRoot({isGlobal:true,validate:validateEnvironment}),
  DatabaseModule,
  ThrottlerModule.forRootAsync({inject:[ConfigService],useFactory:(config:ConfigService)=>[
    {name:'default',ttl:config.getOrThrow<number>('RATE_WINDOW_MS'),limit:(context:ExecutionContext)=>{
      const req=context.switchToHttp().getRequest<Request>();
      const matched:unknown=(req.route as {path?:unknown}|undefined)?.path;
      const path=typeof matched==='string'?matched:req.path;
      return path==='/auth/login'?config.getOrThrow<number>('LOGIN_RATE_LIMIT'):path==='/auth/refresh'?config.getOrThrow<number>('REFRESH_RATE_LIMIT'):100;
    }}]}), AuthModule, ProductsModule],
  providers:[{provide:APP_GUARD,useClass:ThrottlerGuard},{provide:APP_GUARD,useClass:JwtAuthGuard}]})
export class AppModule {}
