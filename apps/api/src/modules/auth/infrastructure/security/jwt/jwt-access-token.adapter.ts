import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DomainError } from '../../../../../shared/domain/domain-error';
import { AccessTokenPort } from '../../../domain/ports/auth-security.port';
@Injectable()
export class JwtAccessTokenAdapter implements AccessTokenPort {
  readonly expiresInSeconds:number;
  constructor(private readonly config:ConfigService,private readonly jwt:JwtService) { this.expiresInSeconds=config.getOrThrow<number>('ACCESS_TOKEN_TTL_SECONDS'); }
  async sign(userId:string):Promise<string> {
    return this.jwt.signAsync({sub:userId},{secret:this.config.getOrThrow<string>('JWT_SECRET'),algorithm:'HS256',issuer:this.config.getOrThrow<string>('JWT_ISSUER'),audience:this.config.getOrThrow<string>('JWT_AUDIENCE'),expiresIn:this.expiresInSeconds});
  }
  async verify(token:string):Promise<{userId:string}> {
    try {
      const payload=await this.jwt.verifyAsync<{sub?:unknown;exp?:unknown}>(token,{secret:this.config.getOrThrow<string>('JWT_SECRET'),algorithms:['HS256'],issuer:this.config.getOrThrow<string>('JWT_ISSUER'),audience:this.config.getOrThrow<string>('JWT_AUDIENCE')});
      if (typeof payload.sub!=='string' || !payload.sub || typeof payload.exp!=='number' || !Number.isSafeInteger(payload.exp)) throw new Error('Missing subject or expiration');
      return {userId:payload.sub};
    } catch { throw new DomainError('UNAUTHORIZED','Invalid authentication'); }
  }
}
