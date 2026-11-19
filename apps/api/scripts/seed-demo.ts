import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../src/core/database/database.module';
import { randomUUID } from 'node:crypto';
import { validateEnvironment } from '../src/shared/infrastructure/configuration/environment';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UserRepositoryPort } from '../src/modules/auth/domain/ports/auth-repositories.port';
import { USER_REPOSITORY_PORT } from '../src/modules/auth/domain/ports/auth-repositories.port';
import { ScryptPasswordHasher } from '../src/modules/auth/infrastructure/security/hashing/scrypt-password.hasher';
import { normalizeEmail } from '../src/modules/auth/domain/entities/user';
@Module({imports:[ConfigModule.forRoot({isGlobal:true,validate:validateEnvironment}),DatabaseModule,CqrsModule.forRoot(),AuthModule]})
class SeedModule {}
export async function seedDemoUser():Promise<void> {
  if (process.env.NODE_ENV==='production') throw new Error('Development seed is disabled in production');
  const app=await NestFactory.createApplicationContext(SeedModule,{logger:false});
  try {
    const config=app.get(ConfigService);
    if (config.get<string>('NODE_ENV')==='production') throw new Error('Development seed is disabled in production');
    const email=config.get<string>('DEMO_USER_EMAIL');const password=config.get<string>('DEMO_USER_PASSWORD');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)) || email.length>254 || !password || password.length<12 || password.length>128) throw new Error('Set valid development seed credentials (password length 12..128)');
    const repository=app.get<UserRepositoryPort>(USER_REPOSITORY_PORT);
    await repository.upsertDemo({id:randomUUID(),email:normalizeEmail(email),passwordHash:await new ScryptPasswordHasher().hash(password),now:new Date()});
  } finally { await app.close(); }
}
if (require.main===module) void seedDemoUser().then(()=>{console.log('Development demo user ensured');}).catch(()=>{console.error('Development seed failed; verify environment and database configuration');process.exitCode=1;});
