import { Model } from 'mongoose';
import { MongooseSessionRepository } from './mongoose-session.repository';
import { MongooseUserRepository } from './mongoose-user.repository';
import { AuthSessionRecord, AuthSessionSchema } from '../schemas/auth-session.schema';
import { UserRecord, UserSchema } from '../schemas/user.schema';
const now=new Date('2026-11-18T00:00:00Z');
const record:AuthSessionRecord={_id:'session-1',userId:'user-1',refreshTokenHash:'b'.repeat(64),previousTokenHashes:['a'.repeat(64)],tokenFamilyId:'session-1',version:1,createdAt:now,updatedAt:now,expiresAt:new Date(now.getTime()+3600000),revokedAt:null};
function query<T>(value:T):{lean:()=>{exec:()=>Promise<T>}} { return {lean:()=>({exec:async()=>value})}; }
it('session rotation uses a conditional atomic update, never read-then-save',async()=>{
 const update=jest.fn().mockReturnValue(query(record));
 const repository=new MongooseSessionRepository({findOneAndUpdate:update} as unknown as Model<AuthSessionRecord>);
 const result=await repository.rotate({sessionId:record._id,oldHash:'a'.repeat(64),newHash:record.refreshTokenHash,now});
 expect(update).toHaveBeenCalledWith({_id:record._id,refreshTokenHash:'a'.repeat(64),revokedAt:null,expiresAt:{$gt:now},version:{$lt:1000}},{$set:{refreshTokenHash:record.refreshTokenHash,updatedAt:now},$push:{previousTokenHashes:'a'.repeat(64)},$inc:{version:1}},{new:true,runValidators:true});
 expect(result?.toPersistence().id).toBe(record._id);expect(result?.version).toBe(1);
});
it('failed CAS returns null and does not invent a rotated session',async()=>{
 const repository=new MongooseSessionRepository({findOneAndUpdate:jest.fn().mockReturnValue(query(null))} as unknown as Model<AuthSessionRecord>);
 expect(await repository.rotate({sessionId:'s',oldHash:'a'.repeat(64),newHash:'b'.repeat(64),now})).toBeNull();
});
it('user mapper converts persistence _id and seed upsert only sets fields on insertion',async()=>{
 const update=jest.fn().mockReturnValue({exec:async()=>undefined});
 const repository=new MongooseUserRepository({findById:()=>query({_id:'user-1',email:'demo@example.test',passwordHash:'hash',createdAt:now,updatedAt:now}),updateOne:update} as unknown as Model<UserRecord>);
 expect((await repository.findById('user-1'))?.toSafe()).toEqual({id:'user-1',email:'demo@example.test',createdAt:now,updatedAt:now});
 await repository.upsertDemo({id:'new-id',email:' DEMO@Example.test ',passwordHash:'new-hash',now});
 expect(update).toHaveBeenCalledWith({email:'demo@example.test'},{$setOnInsert:{_id:'new-id',email:'demo@example.test',passwordHash:'new-hash',createdAt:now,updatedAt:now}},{upsert:true,runValidators:true,timestamps:false});
});
it('declares uniqueness, replay lookup and asynchronous TTL-cleanup indexes',()=>{
 expect(UserSchema.indexes()).toEqual(expect.arrayContaining([[{email:1},expect.objectContaining({unique:true})]]));
 expect(AuthSessionSchema.indexes()).toEqual(expect.arrayContaining([
 [{refreshTokenHash:1},expect.objectContaining({unique:true})],
 [{previousTokenHashes:1},expect.any(Object)],
 [{tokenFamilyId:1},expect.objectContaining({unique:true})],
 [{expiresAt:1},expect.objectContaining({expireAfterSeconds:0})]
 ]));
});
