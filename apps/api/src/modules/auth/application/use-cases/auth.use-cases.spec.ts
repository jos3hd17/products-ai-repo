import { AuthSession, AuthSessionData } from '../../domain/entities/auth-session';
import { User } from '../../domain/entities/user';
import { SessionRepositoryPort, UserRepositoryPort } from '../../domain/ports/auth-repositories.port';
import { AccessTokenPort, ClockPort, IdGeneratorPort, PasswordHasherPort, RefreshTokenPort } from '../../domain/ports/auth-security.port';
import { LoginUseCase } from './login.use-case';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { LogoutUseCase } from './logout.use-case';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
const now=new Date('2026-11-18T00:00:00Z');
const raw='A'.repeat(43);const nextRaw='B'.repeat(43);const hash='a'.repeat(64);const nextHash='b'.repeat(64);
function session(patch:Partial<AuthSessionData>={}):AuthSession { return new AuthSession({id:'family-1',userId:'user-1',refreshTokenHash:hash,previousTokenHashes:[],tokenFamilyId:'family-1',version:0,createdAt:now,updatedAt:now,expiresAt:new Date(now.getTime()+3600000),revokedAt:null,...patch}); }
const user=new User({id:'user-1',email:'Demo@Example.test',passwordHash:'stored-hash',createdAt:now,updatedAt:now});
describe('Auth application use cases with repository ports',()=>{
 let users:jest.Mocked<UserRepositoryPort>;let sessions:jest.Mocked<SessionRepositoryPort>;
 let passwords:jest.Mocked<PasswordHasherPort>;let access:jest.Mocked<AccessTokenPort>;
 let refresh:jest.Mocked<RefreshTokenPort>;let clock:ClockPort;let ids:IdGeneratorPort;
 beforeEach(()=>{
   users={findByEmail:jest.fn().mockResolvedValue(user),findById:jest.fn().mockResolvedValue(user),upsertDemo:jest.fn()};
   sessions={create:jest.fn().mockResolvedValue(undefined),findByTokenHash:jest.fn().mockResolvedValue(session()),rotate:jest.fn().mockResolvedValue(session({refreshTokenHash:nextHash,previousTokenHashes:[hash],version:1})),revoke:jest.fn().mockResolvedValue(undefined)};
   passwords={hash:jest.fn(),verify:jest.fn().mockResolvedValue(true)};
   access={expiresInSeconds:900,sign:jest.fn().mockResolvedValue('synthetic-access-jwt'),verify:jest.fn()};
   refresh={generate:jest.fn().mockReturnValue(nextRaw),hash:jest.fn().mockImplementation((token:string)=>token===raw ? hash:nextHash)};
   clock={now:()=>new Date(now)};ids={generate:()=> 'new-family'};
 });
 const expectUnauthorized=(promise:Promise<unknown>)=>expect(promise).rejects.toMatchObject({code:'UNAUTHORIZED'});
 function login():LoginUseCase {return new LoginUseCase(users,sessions,passwords,access,refresh,clock,ids,604800);}
 function rotate():RefreshTokenUseCase {return new RefreshTokenUseCase(users,sessions,access,refresh,clock);}
 it('login creates a session containing only refresh hash and returns safe token result',async()=>{
   const result=await login().execute({email:' Demo@Example.test ',password:'synthetic-password'});
   expect(users.findByEmail).toHaveBeenCalledWith('demo@example.test');
   const persisted=sessions.create.mock.calls[0][0].toPersistence();
   expect(persisted.refreshTokenHash).toBe(nextHash);expect(JSON.stringify(persisted)).not.toContain(nextRaw);
   expect(result.response).toEqual({accessToken:'synthetic-access-jwt',tokenType:'Bearer',expiresIn:900});
   expect(result.refreshExpiresAt.getTime()-now.getTime()).toBe(604800000);
 });
 it('unknown account still verifies the password and returns generic credentials error',async()=>{
   users.findByEmail.mockResolvedValue(null);
   await expectUnauthorized(login().execute({email:'unknown@example.test',password:'synthetic-password'}));
   expect(passwords.verify).toHaveBeenCalledWith('synthetic-password',null);expect(sessions.create).not.toHaveBeenCalled();
 });
 it('incorrect password does not create a session',async()=>{
   passwords.verify.mockResolvedValue(false);
   await expectUnauthorized(login().execute({email:'demo@example.test',password:'incorrect'}));expect(sessions.create).not.toHaveBeenCalled();
 });
 it('JWT signing failure does not commit login session or refresh rotation',async()=>{
   access.sign.mockRejectedValue(new Error('synthetic signing failure'));
   await expect(login().execute({email:'demo@example.test',password:'synthetic-password'})).rejects.toThrow('synthetic');
   await expect(rotate().execute(raw)).rejects.toThrow('synthetic');
   expect(sessions.create).not.toHaveBeenCalled();expect(sessions.rotate).not.toHaveBeenCalled();
 });
 it('refresh atomically swaps hashes and keeps absolute expiration',async()=>{
   const result=await rotate().execute(raw);
   expect(sessions.rotate).toHaveBeenCalledWith({sessionId:'family-1',oldHash:hash,newHash:nextHash,now});
   expect(result.refreshExpiresAt).toEqual(session().expiresAt);expect(result.refreshToken).toBe(nextRaw);
 });
 it.each([undefined,'short'])('rejects missing or malformed refresh token %s',async token=>{
   await expectUnauthorized(rotate().execute(token));expect(sessions.findByTokenHash).not.toHaveBeenCalled();
 });
 it('rejects unknown refresh token',async()=>{sessions.findByTokenHash.mockResolvedValue(null);await expectUnauthorized(rotate().execute(raw));});
 it.each([{revokedAt:now},{expiresAt:new Date(now.getTime()-1)},{version:1000,previousTokenHashes:Array<string>(1000).fill(nextHash)}])('rejects revoked, expired or exhausted sessions %p',async patch=>{
   sessions.findByTokenHash.mockResolvedValue(session(patch));await expectUnauthorized(rotate().execute(raw));expect(sessions.rotate).not.toHaveBeenCalled();
 });
 it('replay of a prior hash revokes its family',async()=>{
   sessions.findByTokenHash.mockResolvedValue(session({refreshTokenHash:nextHash,previousTokenHashes:[hash],version:1}));
   await expectUnauthorized(rotate().execute(raw));expect(sessions.revoke).toHaveBeenCalledWith('family-1',now);expect(sessions.rotate).not.toHaveBeenCalled();
 });
 it('losing a concurrent CAS revokes the family',async()=>{
   sessions.rotate.mockResolvedValueOnce(session({refreshTokenHash:nextHash,previousTokenHashes:[hash],version:1})).mockResolvedValueOnce(null);
   const results=await Promise.allSettled([rotate().execute(raw),rotate().execute(raw)]);
   expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);expect(sessions.revoke).toHaveBeenCalledWith('family-1',now);
 });
 it('deleted user cannot refresh and its family is revoked',async()=>{users.findById.mockResolvedValue(null);await expectUnauthorized(rotate().execute(raw));expect(sessions.revoke).toHaveBeenCalled();});
 it('logout revokes recognized current or prior token and missing cookie is idempotent',async()=>{
   const logout=new LogoutUseCase(sessions,refresh,clock);await logout.execute(undefined);expect(sessions.findByTokenHash).not.toHaveBeenCalled();
   await logout.execute(raw);expect(sessions.revoke).toHaveBeenCalledWith('family-1',now);
 });
 it('current-user representation excludes password hash and rejects absent user',async()=>{
   const current=new GetCurrentUserUseCase(users);const result=await current.execute('user-1');expect(result).not.toHaveProperty('passwordHash');
   users.findById.mockResolvedValue(null);await expectUnauthorized(current.execute('missing'));
 });
});
