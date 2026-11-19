import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { PasswordHasherPort } from '../../../domain/ports/auth-security.port';
const N=131072; const R=8; const P=1; const KEY_LENGTH=64;
function derive(password:string,salt:Buffer):Promise<Buffer> {
  return new Promise((resolve,reject)=>scrypt(password,salt,KEY_LENGTH,{N,r:R,p:P,maxmem:256*1024*1024},(error,key)=>error ? reject(error):resolve(key)));
}
export class ScryptPasswordHasher implements PasswordHasherPort {
  private readonly dummyHash=this.hash(randomBytes(32).toString('base64url'));
  async hash(password:string):Promise<string> {
    if (typeof password!=='string' || password.length>128) throw new Error('Password exceeds supported length');
    const salt=randomBytes(16);const key=await derive(password,salt);
    return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${key.toString('hex')}`;
  }
  async verify(password:string,hash:string|null):Promise<boolean> {
    if (typeof password!=='string' || password.length>128) return false;
    const encoded=hash ?? await this.dummyHash;
    const pieces=encoded.split('$');
    if (pieces.length!==6 || pieces[0]!=='scrypt' || pieces[1]!==String(N) || pieces[2]!==String(R) || pieces[3]!==String(P) || !/^[a-f0-9]{32}$/.test(pieces[4]) || !/^[a-f0-9]{128}$/.test(pieces[5])) {
      await derive(password,Buffer.alloc(16));return false;
    }
    const candidate=await derive(password,Buffer.from(pieces[4],'hex'));
    const valid=timingSafeEqual(candidate,Buffer.from(pieces[5],'hex'));
    return hash !== null && valid;
  }
}
