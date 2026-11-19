import { AUTH_SESSION_TTL_SECONDS } from './domain/ports/auth-security.port';
import { LoginHandler } from './application/commands/login/login.handler';
import { RefreshTokenHandler } from './application/commands/refresh-token/refresh-token.handler';
import { LogoutHandler } from './application/commands/logout/logout.handler';
import { GetCurrentUserHandler } from './application/queries/get-current-user/get-current-user.handler';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { CookieOriginGuard } from '../../shared/infrastructure/security/cookie-origin.guard';
import { ACCESS_TOKEN_PORT, CLOCK_PORT, ClockPort, ID_GENERATOR_PORT, IdGeneratorPort, PASSWORD_HASHER_PORT, REFRESH_TOKEN_PORT } from './domain/ports/auth-security.port';
import { SESSION_REPOSITORY_PORT, USER_REPOSITORY_PORT } from './domain/ports/auth-repositories.port';
import { AuthController } from './infrastructure/http/controllers/auth.controller';
import { UserSchema } from './infrastructure/persistence/mongoose/schemas/user.schema';
import { AuthSessionSchema } from './infrastructure/persistence/mongoose/schemas/auth-session.schema';
import { MongooseUserRepository } from './infrastructure/persistence/mongoose/repositories/mongoose-user.repository';
import { MongooseSessionRepository } from './infrastructure/persistence/mongoose/repositories/mongoose-session.repository';
import { ScryptPasswordHasher } from './infrastructure/security/hashing/scrypt-password.hasher';
import { OpaqueRefreshTokenAdapter } from './infrastructure/security/hashing/opaque-refresh-token.adapter';
import { JwtAccessTokenAdapter } from './infrastructure/security/jwt/jwt-access-token.adapter';
@Module({imports:[JwtModule.register({}),MongooseModule.forFeature([{name:'User',schema:UserSchema},{name:'AuthSession',schema:AuthSessionSchema}])],controllers:[AuthController],providers:[
  CookieOriginGuard,
  {provide:USER_REPOSITORY_PORT,useClass:MongooseUserRepository},
  {provide:SESSION_REPOSITORY_PORT,useClass:MongooseSessionRepository},
  {provide:PASSWORD_HASHER_PORT,useClass:ScryptPasswordHasher},
  {provide:REFRESH_TOKEN_PORT,useClass:OpaqueRefreshTokenAdapter},
  {provide:ACCESS_TOKEN_PORT,useClass:JwtAccessTokenAdapter},
  {provide:CLOCK_PORT,useValue:{now:()=>new Date()} satisfies ClockPort},
  {provide:ID_GENERATOR_PORT,useValue:{generate:()=>randomUUID()} satisfies IdGeneratorPort},
  {provide:AUTH_SESSION_TTL_SECONDS,inject:[ConfigService],useFactory:(config:ConfigService)=>config.getOrThrow<number>('REFRESH_TOKEN_TTL_SECONDS')},
  LoginHandler, RefreshTokenHandler, LogoutHandler, GetCurrentUserHandler,
],exports:[ACCESS_TOKEN_PORT,USER_REPOSITORY_PORT]})
export class AuthModule {}
