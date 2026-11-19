import { ScryptPasswordHasher } from './scrypt-password.hasher';
import { OpaqueRefreshTokenAdapter } from './opaque-refresh-token.adapter';
it('scrypt uses independent salts and verifies known/unknown accounts without plaintext storage',async()=>{
 const hasher=new ScryptPasswordHasher();const password='synthetic-password-only';const a=await hasher.hash(password);const b=await hasher.hash(password);
 expect(a).not.toBe(b);expect(a).not.toContain(password);expect(await hasher.verify(password,a)).toBe(true);expect(await hasher.verify('wrong',a)).toBe(false);expect(await hasher.verify(password,null)).toBe(false);expect(await hasher.verify(password,'malformed')).toBe(false);
});
it('scrypt rejects encoded attacker-controlled work factors rather than evaluating them',async()=>{
 const hasher=new ScryptPasswordHasher();expect(await hasher.verify('synthetic','scrypt$99999999$8$1$'+'a'.repeat(32)+'$'+'b'.repeat(128))).toBe(false);
});
it('opaque refresh tokens contain 256 random bits and only a fixed digest is persisted',()=>{
 const adapter=new OpaqueRefreshTokenAdapter();const a=adapter.generate();expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);expect(adapter.generate()).not.toBe(a);expect(adapter.hash(a)).toMatch(/^[a-f0-9]{64}$/);expect(adapter.hash(a)).toBe(adapter.hash(a));
});
