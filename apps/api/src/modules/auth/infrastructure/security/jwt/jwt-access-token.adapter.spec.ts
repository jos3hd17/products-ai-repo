import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAccessTokenAdapter } from './jwt-access-token.adapter';
const secret='synthetic-jwt-only-signing-key-at-least32';
const config=new ConfigService({JWT_SECRET:secret,JWT_ISSUER:'test-api',JWT_AUDIENCE:'test-client',ACCESS_TOKEN_TTL_SECONDS:900});
const jwt=new JwtService();const adapter=new JwtAccessTokenAdapter(config,jwt);
it('issues and verifies HS256 access JWT with issuer/audience',async()=>expect(await adapter.verify(await adapter.sign('user-1'))).toEqual({userId:'user-1'}));
it.each([
 {expiresIn:-1},{audience:'wrong'},{issuer:'wrong'},{algorithm:'HS384' as const},{secret:'synthetic-wrong-secret-value-at-least32'}
])('rejects expired, mis-scoped or unexpectedly signed token %p',async patch=>{
 const token=await jwt.signAsync({sub:'user-1'},{secret,algorithm:'HS256',issuer:'test-api',audience:'test-client',expiresIn:900,...patch});
 await expect(adapter.verify(token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
});
it('rejects malformed token and missing subject',async()=>{
 await expect(adapter.verify('not-a-jwt')).rejects.toMatchObject({code:'UNAUTHORIZED'});
 const token=await jwt.signAsync({},{secret,algorithm:'HS256',issuer:'test-api',audience:'test-client',expiresIn:900});await expect(adapter.verify(token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
});

it('rejects correctly signed tokens without required expiration',async()=>{
 const token=await jwt.signAsync({sub:'user-1'},{secret,algorithm:'HS256',issuer:'test-api',audience:'test-client'});
 await expect(adapter.verify(token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
});
