import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import { DatabaseModule } from '../src/core/database/database.module';
import { AuthModule } from '../src/modules/auth/auth.module';
import { ProductsModule } from '../src/modules/products/products.module';
import { validateEnvironment } from '../src/shared/infrastructure/configuration/environment';
import { IsolatedMongo, startIsolatedMongo } from './mongo-harness';
it('shares one managed feature connection across Auth and Products with local schemas', async () => {
  let mongo:IsolatedMongo|undefined;let app:INestApplication|undefined;
  try {
    mongo=await startIsolatedMongo();
    const config=validateEnvironment({NODE_ENV:'test',MONGODB_URI:mongo.uri,JWT_SECRET:'synthetic-database-test-signing-secret-32bytes'});
    const module=await Test.createTestingModule({imports:[
      ConfigModule.forRoot({isGlobal:true,ignoreEnvFile:true,load:[()=>config]}),
      CqrsModule.forRoot(),DatabaseModule,AuthModule,ProductsModule,
    ]}).compile();
    app=module.createNestApplication({logger:false});await app.init();
    const connection=app.get<Connection>(getConnectionToken());
    expect(connection.readyState).toBe(1);
    for(const name of ['Product','User','AuthSession']) {
      const model=app.get<Model<unknown>>(getModelToken(name));
      expect(model.db).toBe(connection);
    }
    expect(Object.keys(connection.models).sort()).toEqual(['AuthSession','Product','User']);
    expect(connection.name).toMatch(/^assessment_test_/);
  } finally {try{await app?.close();}finally{await mongo?.stop();}}
});
