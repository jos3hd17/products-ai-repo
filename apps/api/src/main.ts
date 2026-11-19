import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { setupHealth } from './core/health/health';
import { setupSwagger } from './core/openapi/swagger';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap';
async function bootstrap():Promise<void> {
  const app=await NestFactory.create(AppModule,{bodyParser:false,abortOnError:false});
  configureApplication(app);setupHealth(app);setupSwagger(app);app.enableShutdownHooks();
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'),'0.0.0.0');
}
if (require.main === module) void bootstrap().catch(()=>{console.error('API startup failed; verify configuration and database availability');process.exitCode=1;});
