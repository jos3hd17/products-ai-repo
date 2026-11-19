import { createHash, randomBytes } from 'node:crypto';
import { RefreshTokenPort } from '../../../domain/ports/auth-security.port';
export class OpaqueRefreshTokenAdapter implements RefreshTokenPort {
  generate():string { return randomBytes(32).toString('base64url'); }
  hash(token:string):string { return createHash('sha256').update(token,'utf8').digest('hex'); }
}
