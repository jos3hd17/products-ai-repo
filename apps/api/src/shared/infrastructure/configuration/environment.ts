export interface APIConfig {
  SWAGGER_ENABLED: boolean; NODE_ENV: string; PORT: number; MONGODB_URI: string; JWT_SECRET: string;
  JWT_ISSUER: string; JWT_AUDIENCE: string; ACCESS_TOKEN_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_SECONDS: number; CORS_ORIGINS: string[];
  COOKIE_SAME_SITE: 'lax' | 'strict' | 'none';
  LOGIN_RATE_LIMIT: number; REFRESH_RATE_LIMIT: number; RATE_WINDOW_MS: number;
}
export function validateEnvironment(env: Record<string, unknown>): APIConfig {
  const text = (key: string, fallback?: string): string => {
    const value = env[key] ?? fallback;
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid configuration: ${key}`);
    return value;
  };
  const integer = (key: string, fallback: number, max: number): number => {
    const value = env[key] ?? fallback;
    if (!/^\d+$/.test(String(value))) throw new Error(`Invalid configuration: ${key}`);
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new Error(`Invalid configuration: ${key}`);
    return n;
  };
  const nodeEnv = text('NODE_ENV','development');
  if (!['development','test','production'].includes(nodeEnv)) throw new Error('Invalid NODE_ENV');
  const rawSwagger=env.SWAGGER_ENABLED ?? (nodeEnv==='development'?'true':'false');
  if(!['true','false',true,false].includes(rawSwagger as string|boolean)) throw new Error('Invalid SWAGGER_ENABLED');
  const swagger=rawSwagger===true||rawSwagger==='true';
  if(nodeEnv==='production'&&swagger) throw new Error('Swagger must remain disabled in production');
  const uri = text('MONGODB_URI');
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new Error('Invalid MONGODB_URI');
  const secret = text('JWT_SECRET');
  if (Buffer.byteLength(secret) < 32 || secret.startsWith('REPLACE_')) throw new Error('JWT_SECRET must contain at least 32 bytes and must not be a placeholder');
  const origins = text('CORS_ORIGINS','http://localhost:4200').split(',').map(x=>x.trim());
  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:','https:'].includes(url.protocol) || url.origin !== origin || (nodeEnv === 'production' && url.protocol !== 'https:')) throw new Error('Invalid CORS_ORIGINS');
  }
  const sameSite = text('COOKIE_SAME_SITE','lax');
  if (!['lax','strict','none'].includes(sameSite) || (sameSite === 'none' && nodeEnv !== 'production')) throw new Error('Invalid COOKIE_SAME_SITE');
  return {SWAGGER_ENABLED:swagger,NODE_ENV:nodeEnv, PORT:integer('PORT',3000,65535), MONGODB_URI:uri, JWT_SECRET:secret,
    JWT_ISSUER:text('JWT_ISSUER','product-api'), JWT_AUDIENCE:text('JWT_AUDIENCE','product-client'),
    ACCESS_TOKEN_TTL_SECONDS:integer('ACCESS_TOKEN_TTL_SECONDS',900,3600),
    REFRESH_TOKEN_TTL_SECONDS:integer('REFRESH_TOKEN_TTL_SECONDS',604800,2592000), CORS_ORIGINS:[...new Set(origins)],
    COOKIE_SAME_SITE:sameSite as APIConfig['COOKIE_SAME_SITE'],
    LOGIN_RATE_LIMIT:integer('LOGIN_RATE_LIMIT',5,1000), REFRESH_RATE_LIMIT:integer('REFRESH_RATE_LIMIT',20,1000),
    RATE_WINDOW_MS:integer('RATE_WINDOW_MS',60000,3600000)};
}
