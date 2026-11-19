import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as os from 'node:os';

/** Shared connection configuration; each feature still owns its forFeature schemas. */
@Module({
  imports: [ConfigModule, MongooseModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      uri: config.getOrThrow<string>('MONGODB_URI'),
      serverSelectionTimeoutMS: 5000,
      // Preserve the verified Jest-only Mongo driver OS-loader workaround (BUG-002).
      ...(config.get<string>('NODE_ENV') === 'test' ? { runtimeAdapters: { os } } : {}),
    }),
  })],
  exports: [MongooseModule],
})
export class DatabaseModule {}
