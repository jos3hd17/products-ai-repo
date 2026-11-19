import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';
export function getCookieOptions(config: ConfigService): CookieOptions {
  return {httpOnly:true, secure:config.getOrThrow<string>('NODE_ENV') === 'production',
    sameSite:config.getOrThrow<'lax'|'strict'|'none'>('COOKIE_SAME_SITE'), path:'/auth',
    maxAge:config.getOrThrow<number>('REFRESH_TOKEN_TTL_SECONDS') * 1000};
}
