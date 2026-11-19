import { User } from './user';
import { AuthSession, AuthSessionData } from './auth-session';
const now=new Date('2026-11-18T00:00:00Z');
const base:AuthSessionData={id:'s',userId:'u',refreshTokenHash:'a'.repeat(64),previousTokenHashes:[],tokenFamilyId:'s',createdAt:now,updatedAt:now,expiresAt:new Date(now.getTime()+1000),revokedAt:null,version:0};
it('user normalizes email and safe projections do not mutate stored timestamps',()=>{
 const user=new User({id:'u',email:' USER@Example.test ',passwordHash:'hash',createdAt:now,updatedAt:now});const view=user.toSafe();view.createdAt.setFullYear(2000);expect(user.email).toBe('user@example.test');expect(user.toSafe().createdAt).toEqual(now);expect(view).not.toHaveProperty('passwordHash');
});
it('invalid user data and session hash/history are domain errors',()=>{
 expect(()=>new User({id:'u',email:'invalid',passwordHash:'hash',createdAt:now,updatedAt:now})).toThrow();
 expect(()=>new AuthSession({...base,refreshTokenHash:'raw-token'})).toThrow();
 expect(()=>new AuthSession({...base,version:1})).toThrow();
});
it('session expiration/revocation and rotation limits are explicit, not delegated to TTL cleanup',()=>{
 expect(new AuthSession(base).isUsable(now)).toBe(true);
 expect(new AuthSession(base).isUsable(base.expiresAt)).toBe(false);
 expect(new AuthSession({...base,revokedAt:now}).isUsable(now)).toBe(false);
 expect(new AuthSession({...base,version:1000,previousTokenHashes:Array<string>(1000).fill('b'.repeat(64))}).isUsable(now)).toBe(false);
});
it('session snapshots do not expose mutable internal arrays or dates',()=>{
 const session=new AuthSession(base);const view=session.toPersistence();view.previousTokenHashes.push('bad');view.expiresAt.setFullYear(2000);expect(session.toPersistence().previousTokenHashes).toEqual([]);expect(session.expiresAt).toEqual(base.expiresAt);
});
