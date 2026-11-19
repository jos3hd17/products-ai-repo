import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ACCESS_TOKEN_PORT, AccessTokenPort } from '../../../modules/auth/domain/ports/auth-security.port';
import { IS_PUBLIC } from './public.decorator';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector:Reflector, @Inject(ACCESS_TOKEN_PORT) private readonly tokens:AccessTokenPort) {}
  async canActivate(context:ExecutionContext):Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC,[context.getHandler(),context.getClass()])) return true;
    const req=context.switchToHttp().getRequest<Request & {userId?:string}>();
    const match=/^Bearer ([A-Za-z0-9._-]+)$/.exec(req.get('authorization') ?? '');
    if (!match) throw new UnauthorizedException('Authentication required');
    try { const claims=await this.tokens.verify(match[1]); req.userId=claims.userId; }
    catch { throw new UnauthorizedException('Authentication required'); }
    return true;
  }
}
