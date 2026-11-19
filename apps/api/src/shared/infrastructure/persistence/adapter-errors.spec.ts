import { Model, Types } from 'mongoose';
import { PersistenceFailure } from '../../domain/persistence-failure';
import { MongooseProductRepository } from '../../../modules/products/infrastructure/persistence/mongoose/repositories/mongoose-product.repository';
import { ProductRecord } from '../../../modules/products/infrastructure/persistence/mongoose/schemas/product.schema';
import { Product } from '../../../modules/products/domain/entities/product';
import { MongooseUserRepository } from '../../../modules/auth/infrastructure/persistence/mongoose/repositories/mongoose-user.repository';
import { UserRecord } from '../../../modules/auth/infrastructure/persistence/mongoose/schemas/user.schema';
import { MongooseSessionRepository } from '../../../modules/auth/infrastructure/persistence/mongoose/repositories/mongoose-session.repository';
import { AuthSessionRecord } from '../../../modules/auth/infrastructure/persistence/mongoose/schemas/auth-session.schema';
const detail='SYNTHETIC_PRIVATE_DB_DETAIL';
const providerError=Object.assign(new Error(detail),{name:'MongoServerError',code:11000});
function rejectedQuery() {return {lean:()=>({exec:async()=>{throw providerError;}})};}
it('maps Products DB failures to a provider-independent port error', async()=>{
  const repository=new MongooseProductRepository({create:jest.fn().mockRejectedValue(providerError)} as unknown as Model<ProductRecord>);
  const product=Product.create(new Types.ObjectId().toHexString(),{name:'Seed',priceMinor:1,stock:0});
  await expect(repository.create(product)).rejects.toBeInstanceOf(PersistenceFailure);
  await expect(repository.create(product)).rejects.not.toHaveProperty('code');
  await expect(repository.create(product)).rejects.not.toThrow(detail);
});
it('maps Auth user and session adapter failures without provider details', async()=>{
  const users=new MongooseUserRepository({findByEmail:jest.fn().mockReturnValue(rejectedQuery()),findOne:jest.fn().mockReturnValue(rejectedQuery())} as unknown as Model<UserRecord>);
  const sessions=new MongooseSessionRepository({findOneAndUpdate:jest.fn().mockReturnValue(rejectedQuery())} as unknown as Model<AuthSessionRecord>);
  await expect(users.findByEmail('demo@example.test')).rejects.toBeInstanceOf(PersistenceFailure);
  await expect(sessions.rotate({sessionId:'s',oldHash:'a',newHash:'b',now:new Date()})).rejects.toBeInstanceOf(PersistenceFailure);
});
it('does not turn domain input validation into an infrastructure error', async()=>{
  const repository=new MongooseProductRepository({} as Model<ProductRecord>);
  await expect(repository.findById('invalid')).rejects.toMatchObject({code:'INVALID_INPUT'});
});
