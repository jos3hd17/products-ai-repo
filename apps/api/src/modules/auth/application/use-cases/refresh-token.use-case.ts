import { DomainError } from '../../../../shared/domain/domain-error';
import { SessionRepositoryPort, UserRepositoryPort } from '../../domain/ports/auth-repositories.port';
import { AccessTokenPort, ClockPort, RefreshTokenPort } from '../../domain/ports/auth-security.port';
import { AuthResult } from '../dto/auth.contracts';
export class RefreshTokenUseCase {
  constructor(private readonly users:UserRepositoryPort,private readonly sessions:SessionRepositoryPort,private readonly access:AccessTokenPort,private readonly refresh:RefreshTokenPort,private readonly clock:ClockPort) {}
  async execute(token:string|undefined):Promise<AuthResult> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DomainError('UNAUTHORIZED','Invalid session');
    const hash=this.refresh.hash(token);const now=this.clock.now();
    const session=await this.sessions.findByTokenHash(hash);
    if (!session || !session.isUsable(now)) throw new DomainError('UNAUTHORIZED','Invalid session');
    if (!session.matchesCurrent(hash)) { await this.sessions.revoke(session.id,now);throw new DomainError('UNAUTHORIZED','Invalid session'); }
    const user=await this.users.findById(session.userId);
    if (!user) { await this.sessions.revoke(session.id,now);throw new DomainError('UNAUTHORIZED','Invalid session'); }
    const accessToken=await this.access.sign(user.id);
    const replacement=this.refresh.generate();
    const rotated=await this.sessions.rotate({sessionId:session.id,oldHash:hash,newHash:this.refresh.hash(replacement),now:this.clock.now()});
    if (!rotated) { await this.sessions.revoke(session.id,this.clock.now());throw new DomainError('UNAUTHORIZED','Invalid session'); }
    return {response:{accessToken,tokenType:'Bearer',expiresIn:this.access.expiresInSeconds},refreshToken:replacement,refreshExpiresAt:rotated.expiresAt};
  }
}
