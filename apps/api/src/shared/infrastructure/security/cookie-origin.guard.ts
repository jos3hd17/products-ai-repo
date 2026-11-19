import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
@Injectable()
export class CookieOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const origin = req.get('origin');
    if (!origin || !this.config.getOrThrow<string[]>('CORS_ORIGINS').includes(origin) || req.get('x-csrf-protection') !== '1') throw new ForbiddenException('Request origin or CSRF header rejected');
    return true;
  }
}
